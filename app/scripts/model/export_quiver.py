#!/usr/bin/env python3
"""The Quiver Dev Kit for the 3D model page, from a project-quiver checkout.

Builds the assembly the way its build123d code does (quiver.assembly.make_assembly)
and writes a raw GLB with the tree the page has always read: root "Quiver Drone"
(the CAD's Z-up turned Y-up on the root node, meters, CAD origin kept) > BOM
category (Airframe Structure …) > subassembly (Plates, Beams …) > one node per
placed part, named by its CAD label ("1111_upper_plate", "1310-VerticalTube").
The label's leading four digits are the BOM number the app keys parts on
(`partOf` in src/projects/models.ts). Each distinct part is tessellated once and
shared by all of its instances. Positions only, no normals or UVs: the viewer
shades flat. convert.mjs compresses the result.

    python export_quiver.py <project-quiver checkout> <raw.glb>

Needs build123d 0.10 (the checkout's src/constraints.txt). Stops if a placed part
has no BOM line, or if the model's extent is more than 0.5 mm off the CAD's.
"""

from __future__ import annotations

import hashlib
import json
import re
import struct
import subprocess
import sys
import time
from collections import Counter
from pathlib import Path

import numpy as np

BOM_LABEL = re.compile(r"^(\d{4})[-_]")

# Tessellation by BOM number prefix (first match wins): linear deflection (mm)
# sets the chord error on large radii, the angular one (rad) floors small circles.
# Vendor models with hundreds of small bodies (motors, PCBs, battery, sensors) get
# a coarser mesh and a simplify error (a fraction of the mesh's size) that
# convert.mjs applies; printed and cut parts stay fine enough to read their edges.
TESS = [
    ("3111", 0.15, 1.0, 0.004),  # motors: four of them, ~130k triangles each at the default
    ("33", 0.15, 1.0, 0.003),  # PCBs: hundreds of component bodies
    ("3410", 0.15, 1.0, 0.004),  # battery
    ("32", 0.10, 0.8, 0.002),  # peripherals (vendor models)
    ("2311", 0.10, 0.8, 0.002),  # main PCB adapter
    ("", 0.05, 0.5, None),
]

# The 2311 STEP also carries the screws, threaded inserts and rubber spacers it
# is assembled with. Those are fasteners, which the model leaves out, so only
# its largest solid (the printed adapter) is kept.
KEEP_LARGEST_SOLID = ("2311",)

# The CAD's extent in mm (project-quiver src/tests/test_assembly.py: BBOX_MIN/MAX).
CAD_MIN = (-664.5, -673.6, -547.9)
CAD_MAX = (664.5, 673.6, 193.7)


def tess(bom: str):
    return next(t[1:] for t in TESS if bom.startswith(t[0]))


def matrix(loc) -> np.ndarray:
    """4x4 of a TopLoc_Location (mm)."""
    t = loc.Transformation()
    m = np.eye(4)
    for i in range(3):
        for j in range(4):
            m[i, j] = t.Value(i + 1, j + 1)
    return m


def weld(v: np.ndarray, f: np.ndarray, tol=1e-4):
    """Merge vertices closer than tol (mm), drop triangles that collapse."""
    if not len(v):
        return v, f
    _, first, inv = np.unique(np.round(v / tol).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    f = inv.reshape(-1)[f]
    keep = (f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 2] != f[:, 0])
    return v[first], f[keep]


def own_shape(node, bom: str):
    """The part in its own frame: the node's placement removed (it becomes the
    GLB node's matrix). For KEEP_LARGEST_SOLID parts, only the largest solid."""
    from OCP.BRepGProp import BRepGProp
    from OCP.GProp import GProp_GProps
    from OCP.TopAbs import TopAbs_SOLID
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopLoc import TopLoc_Location

    shape = node.wrapped.Located(TopLoc_Location())
    if bom not in KEEP_LARGEST_SOLID:
        return shape
    best, best_vol = None, -1.0
    ex = TopExp_Explorer(shape, TopAbs_SOLID)
    while ex.More():
        p = GProp_GProps()
        BRepGProp.VolumeProperties_s(ex.Current(), p, 1e-9, True, False)
        if abs(p.Mass()) > best_vol:
            best, best_vol = ex.Current(), abs(p.Mass())
        ex.Next()
    return best


def tessellate(wrapped, lin: float, ang: float, label: str):
    """Vertices (mm, the part's own frame) and triangles of every face."""
    from OCP.BRep import BRep_Tool
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS

    BRepMesh_IncrementalMesh(wrapped, lin, False, ang, True)
    verts, tris, n, missing = [], [], 0, 0
    faces = TopExp_Explorer(wrapped, TopAbs_FACE)
    while faces.More():
        face = TopoDS.Face_s(faces.Current())
        faces.Next()
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(face, loc)
        if tri is None:
            missing += 1
            continue
        trsf = loc.Transformation()
        for i in range(1, tri.NbNodes() + 1):
            p = tri.Node(i).Transformed(trsf)
            verts.append((p.X(), p.Y(), p.Z()))
        flip = face.Orientation() == TopAbs_REVERSED
        for i in range(1, tri.NbTriangles() + 1):
            a, b, c = tri.Triangle(i).Get()
            tris.append((n + a - 1, n + c - 1, n + b - 1) if flip else (n + a - 1, n + b - 1, n + c - 1))
        n += tri.NbNodes()
    if missing:
        print(f"  note: {missing} faces of {label} did not mesh", flush=True)
    return weld(np.array(verts, float).reshape(-1, 3), np.array(tris, np.int64).reshape(-1, 3))


def write_glb(path: Path, nodes: list, meshes: list):
    """Minimal glTF 2.0 binary: float32 positions (m) and uint16/uint32 indices per
    mesh, plus extras.simplify on the meshes convert.mjs should simplify."""
    blob, views, accessors, gl_meshes = bytearray(), [], [], []

    def view(data: bytes, target: int) -> int:
        blob.extend(b"\0" * (-len(blob) % 4))
        views.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(data), "target": target})
        blob.extend(data)
        return len(views) - 1

    for name, v, f, simplify in meshes:
        pos = (v / 1000).astype("<f4")
        idx = f.astype("<u2" if len(v) <= 65535 else "<u4")
        accessors.append({"bufferView": view(pos.tobytes(), 34962), "componentType": 5126, "count": len(pos),
                          "type": "VEC3", "min": pos.min(0).tolist(), "max": pos.max(0).tolist()})
        accessors.append({"bufferView": view(idx.tobytes(), 34963), "count": idx.size, "type": "SCALAR",
                          "componentType": 5123 if idx.dtype == np.uint16 else 5125})
        gl_meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": len(accessors) - 2},
                                                         "indices": len(accessors) - 1}]})
        if simplify:
            gl_meshes[-1]["extras"] = {"simplify": simplify}
    doc = {"asset": {"version": "2.0", "generator": "superapp scripts/model/export_quiver.py"},
           "scene": 0, "scenes": [{"nodes": [0]}], "nodes": nodes, "meshes": gl_meshes,
           "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(blob)}]}
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    blob.extend(b"\0" * (-len(blob) % 4))
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 28 + len(js) + len(blob))
                     + struct.pack("<II", len(js), 0x4E4F534A) + js
                     + struct.pack("<II", len(blob), 0x004E4942) + bytes(blob))


def gl_matrix(m: np.ndarray) -> list:
    m = m.copy()
    m[:3, 3] /= 1000  # mm -> m
    return [round(float(x), 9) for x in m.T.reshape(-1)]


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    checkout, raw = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    sys.path.insert(0, str(checkout / "src"))
    import yaml

    from quiver.assembly import make_assembly

    t0 = time.time()
    assembly = make_assembly()
    print(f"assembly built in {time.time() - t0:.0f} s", flush=True)
    bom_ids = {str(it["id"]) for f in sorted((checkout / "bom").glob("[1-4]000-*.yaml"))
               for it in (yaml.safe_load(f.read_text()).get("items") or [])}

    # Root first: the CAD's Z-up turned Y-up, as in every earlier quiver.glb.
    nodes = [{"name": assembly.label or "Quiver Drone", "rotation": [-0.5 ** 0.5, 0, 0, 0.5 ** 0.5], "children": []}]
    meshes, by_hash, placed = [], {}, []

    def add(node, parent: int, parent_world: np.ndarray):
        local = matrix(node.wrapped.Location())
        world = parent_world @ local
        label = node.label or ""
        m = BOM_LABEL.match(label)
        if m:
            bom = m.group(1)
            if bom not in bom_ids:
                sys.exit(f"{label}: BOM number {bom} has no line in the checkout's bom/*.yaml")
            lin, ang, simplify = tess(bom)
            v, f = tessellate(own_shape(node, bom), lin, ang, label)
            key = hashlib.sha1(np.round(v, 4).tobytes() + f.astype(np.int64).tobytes()).hexdigest()
            if key not in by_hash:
                by_hash[key] = len(meshes)
                meshes.append((label, v, f, simplify))
            nodes.append({"name": label, "mesh": by_hash[key], "matrix": gl_matrix(local)})
            placed.append((bom, label, world, by_hash[key]))
        else:
            nodes.append({"name": label, **({} if np.allclose(local, np.eye(4)) else {"matrix": gl_matrix(local)}), "children": []})
        me = len(nodes) - 1
        nodes[parent].setdefault("children", []).append(me)
        if not m:
            for child in node.children:
                add(child, me, world)

    for child in assembly.children:
        add(child, 0, matrix(assembly.wrapped.Location()))
    raw.parent.mkdir(parents=True, exist_ok=True)
    write_glb(raw, nodes, meshes)

    # The model's extent must be the CAD's.
    lo, hi = np.full(3, np.inf), np.full(3, -np.inf)
    for _, _, world, mi in placed:
        v = meshes[mi][1] @ world[:3, :3].T + world[:3, 3]
        lo, hi = np.minimum(lo, v.min(0)), np.maximum(hi, v.max(0))
    if not (np.allclose(lo, CAD_MIN, atol=0.5) and np.allclose(hi, CAD_MAX, atol=0.5)):
        sys.exit(f"extent {lo.round(2)} .. {hi.round(2)} differs from the CAD's {CAD_MIN} .. {CAD_MAX}")

    commit = subprocess.run(["git", "-C", str(checkout), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    if not commit and (checkout / ".commit").exists():
        commit = (checkout / ".commit").read_text().strip()[:7]
    ids = Counter(b for b, *_ in placed)
    stored = sum(len(m[2]) for m in meshes)
    drawn = sum(len(meshes[mi][2]) for *_, mi in placed)
    print(f"{len(placed)} placed parts, {len(ids)} BOM numbers, {len(meshes)} meshes, "
          f"{stored} triangles stored / {drawn} drawn; extent {lo.round(1)} .. {hi.round(1)} mm; "
          f"{raw.stat().st_size / 1e6:.1f} MB raw; source {commit or '?'} [{time.time() - t0:.0f} s]")


if __name__ == "__main__":
    main()
