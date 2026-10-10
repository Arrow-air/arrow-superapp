#!/usr/bin/env python3
"""The Longshot battery pack for the 3D model page, from a project-longshot checkout.

Rebuilds the main assembly the way its build123d code does (longshot.assembly):
every leaf of the Fusion tree in placements.json, placed with its composed
location; custom parts from the parametric part modules, purchased and PCB parts
from the committed reference STEPs. PCB copper and silkscreen are not committed,
so they are left out, as in the assembly. Writes

  - a raw GLB: one mesh per distinct part, shared by all of its instances, under
    root > family > assembly (where the family has them) > one node per placed
    part, named by its BOM.csv part number plus an instance number when the
    part repeats ("PW-CELL-001-21700 17"). Meters, the CAD's Z-up turned Y-up as
    in quiver.glb, positions only (the viewer shades flat). convert.mjs
    compresses it.
  - the manifest (longshot-model.json): families, parts, BOM refs, source commit.

    python export_longshot.py <project-longshot checkout> <raw.glb> <manifest.json>

Needs build123d 0.10 (engineering/cad/build123d/requirements.txt in the checkout).
"""

from __future__ import annotations

import csv
import json
import re
import struct
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

CAD = "engineering/cad/build123d"
REPO_URL = "https://github.com/Arrow-air/project-longshot"

# Families in viewer order, and where each BOM line goes: (family, assembly).
# No assembly puts the parts straight under the family, which is then one layer.
FAMILIES = {
    "cells": "Cells",
    "cell-holders": "Cell holders",
    "busbars": "Busbars",
    "enclosure": "Enclosure",
    "mounting": "Mounting",
    "electronics": "Electronics",
}
MAIN, SENSE = "Main board", "Voltage-sense boards"
GROUP = {
    "PW-CELL-001-21700": ("cells", None),
    "EN-CELL-001-Upper_Cell_Holder": ("cell-holders", None),
    "EN-CELL-001-Bottom_Cell_Holder": ("cell-holders", None),
    "PW-BUS-001-N_Terminal": ("busbars", None),
    "PW-BUS-002-P_Terminal": ("busbars", None),
    "PW-BUS-003-Bridge_1": ("busbars", None),
    "PW-BUS-004-Bridge_2": ("busbars", None),
    "PW-BUS-005-Screw_Terminal_Negative": ("busbars", None),
    "PW-BUS-006-Screw_Terminal_Positive": ("busbars", None),
    "EN-PC-001-Top_Plate": ("enclosure", "Plates"),
    "EN-PC-002-Bottom_Plate": ("enclosure", "Plates"),
    "EN-SHEET-001-Reinfocement_Right": ("enclosure", "Reinforcements"),
    "EN-SHEET-002-Reinfocement_Left": ("enclosure", "Reinforcements"),
    "EN-PRINT-001-3D-Printable_Battery_Base": ("enclosure", "Base and top cover"),
    "EN-PRINT-002-3D-Printable_Battery_Top_Cover": ("enclosure", "Base and top cover"),
    "EN-STRAP-001-Metal_piece": ("mounting", "Strap"),
    "EN-STRAP-002-Rubber_Part": ("mounting", "Strap"),
    "EN-STRAP-003-Metal_End": ("mounting", "Strap"),
    "Tattu_4_0_30Ah_Clip": ("mounting", "Tattu clip"),
    "EN-INSERT-001-ruthex_RX-M3x5_7": ("mounting", "Inserts"),
    "EN-INSERT-002-ruthex_RX-M4x8_1": ("mounting", "Inserts"),
    # The main fuse is mounted on the SL_PCB, over its two AMT0450003DB0000G parts.
    "SL_PCB-002-SL_PCB_V3": ("electronics", MAIN),
    "ET60S-D06-0-00-D06-L-V1-S": ("electronics", MAIN),
    "EL-FUSE-001-AMXL-200": ("electronics", MAIN),
    "FUSE-SMD_L10_0-W5_0-H3_8": ("electronics", MAIN),
    "AMT0450003DB0000G": ("electronics", MAIN),
    "CONN-TH_430451612": ("electronics", MAIN),
    "CONN-SMD_SM7B-GHS-TB-LF-SN": ("electronics", MAIN),  # the ones inside a VS_PCB go to SENSE
    "VS_PCB_COMPLETE_TOP_LEFT": ("electronics", SENSE),
    "VS_PCB_COMPLETE_TOP_RIGHT": ("electronics", SENSE),
    "VS_PCB_COMPLETE_BOTTOM_LEFT": ("electronics", SENSE),
    "VS_PCB_COMPLETE_BOTTOM_RIGHT": ("electronics", SENSE),
}

# Tessellation by BOM-line prefix (first match wins): linear deflection (mm) sets
# the chord error on large radii, the angular one (rad) only floors small circles
# at about 8 segments, so tiny features stay cheap. Parts drawn many times and
# hidden inside others also get a simplify error (a fraction of their own size)
# that convert.mjs applies; everything else is not simplified.
TESS = [
    ("PW-CELL-001", 0.08, 0.8, None),  # one mesh for all 126 cells, about 26 segments around
    ("EN-INSERT", 0.1, 1.0, 0.02),  # 71 knurled inserts, inside the cell holders
    ("FUSE-SMD", 0.08, 0.8, 0.01),  # 15 SMD fuses on the SL_PCB
    ("CONN-SMD", 0.08, 0.8, 0.01),  # 8 small sense connectors
    ("SL_PCB", 0.1, 1.5, None),  # boards: hundreds of vias, 5 segments each
    ("VS_PCB", 0.1, 1.5, None),
    ("", 0.05, 0.8, None),
]


def tess(line: str):
    """(linear deflection, angular deflection, simplify error) for a BOM line."""
    return next(t[1:] for t in TESS if line.startswith(t[0]))


def rigid(m) -> np.ndarray:
    """A placements.json matrix as longshot.reference.matrix_to_location reads it:
    rotation rebuilt from its Z and X columns (right-handed), translation as is."""
    m = np.asarray(m, float)
    z = m[:3, 2] / np.linalg.norm(m[:3, 2])
    x = m[:3, 0] - (m[:3, 0] @ z) * z
    x /= np.linalg.norm(x)
    out = np.eye(4)
    out[:3, 0], out[:3, 1], out[:3, 2], out[:3, 3] = x, np.cross(z, x), z, m[:3, 3]
    return out


def leaves(node, parent=np.eye(4), path=()):
    """Each leaf of the Fusion tree: part key, its parent's global 4x4, its own local 4x4, path."""
    local = rigid(node["location"])
    path = path + (node["label"],)
    if "children" not in node:
        yield node["part"], parent, local, path
        return
    for child in node["children"]:
        yield from leaves(child, parent @ local, path)


def weld(v: np.ndarray, f: np.ndarray, tol=1e-4):
    """Merge vertices closer than tol (mm), drop triangles that collapse."""
    _, first, inv = np.unique(np.round(v / tol).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    f = inv.reshape(-1)[f]
    keep = (f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 2] != f[:, 0])
    return v[first], f[keep]


def tessellate(shape, lin: float, ang: float, label: str):
    """Vertices (mm, component frame) and triangles of every face of a part."""
    from OCP.BRep import BRep_Tool
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopLoc import TopLoc_Location
    from OCP.TopoDS import TopoDS

    # The assembly swaps a part's own top-level location for its placement (_relocate).
    wrapped = shape.wrapped.Located(TopLoc_Location())
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
        print(f"  warning: {missing} faces of {label} did not mesh", flush=True)
    return weld(np.array(verts, float), np.array(tris, np.int64))


def write_glb(path: Path, nodes: list, meshes: list):
    """Minimal glTF 2.0 binary: float32 positions (m) and uint16/uint32 indices per mesh,
    plus extras.simplify on the meshes convert.mjs should simplify."""
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
    doc = {"asset": {"version": "2.0", "generator": "superapp scripts/model/export_longshot.py"},
           "scene": 0, "scenes": [{"nodes": [0]}], "nodes": nodes, "meshes": gl_meshes,
           "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(blob)}]}
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    blob.extend(b"\0" * (-len(blob) % 4))
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 28 + len(js) + len(blob))
                     + struct.pack("<II", len(js), 0x4E4F534A) + js
                     + struct.pack("<II", len(blob), 0x004E4942) + bytes(blob))


def split_description(text: str):
    """BOM description -> (name, note): the first clause names the part, the rest is a note."""
    head, rest = (re.split(r"\.\s+|;\s+", text, maxsplit=1) + [""])[:2]
    m = re.match(r"^(.*?)\s*\((.*)\)$", head)
    if m:
        head, rest = m.group(1), "; ".join(s for s in (m.group(2), rest) if s)
    return head.strip(), rest.strip()


def spans(nums: list[int]) -> str:
    """[1, 2, 3, 7] -> '1-3, 7'"""
    out, start = [], nums[0]
    for a, b in zip(nums, nums[1:] + [None]):
        if b != a + 1:
            out.append(f"{start}" if start == a else f"{start}-{a}")
            start = b
    return ", ".join(out)


def main() -> None:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    checkout, raw, manifest_path = (Path(a).resolve() for a in sys.argv[1:])
    sys.path.insert(0, str(checkout / CAD / "src"))
    from longshot import catalog
    from longshot.assembly import part_shape
    from longshot.reference import placements

    t0 = time.time()
    meta = placements()
    bom = list(csv.DictReader((checkout / CAD / "BOM.csv").open(encoding="utf-8")))
    order = {row["Part number"]: i for i, row in enumerate(bom)}
    unplaced = set(order) - set(GROUP)
    if unplaced:
        sys.exit(f"BOM lines without a family in GROUP: {sorted(unplaced)}")
    # A part's id is its BOM.csv part number; node names are "<id>" or "<id> <n>".
    for a in order:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", a) or any(b != a and b.startswith(a) for b in order):
            sys.exit(f"part number {a!r} has odd characters or prefixes another one")

    # One instance per placed BOM item. A PCB's layers ("BOARD:layer" keys) are
    # leaves of its Fusion component and merge into one board instance there.
    instances, boards, placed = [], {}, []
    for key, parent, local, path in leaves(meta["tree"]):
        placed.append((key, parent @ local))
        if part_shape(key) is None:  # PCB copper and silkscreen: no committed geometry
            continue
        line = catalog.bom_line(key)
        if ":" in key:
            if path[:-1] not in boards:
                boards[path[:-1]] = len(instances)
                instances.append(dict(line=line, frame=parent, parts=[], path=path[:-1]))
            instances[boards[path[:-1]]]["parts"].append((key, local))
        else:
            instances.append(dict(line=line, frame=parent @ local, parts=[(key, np.eye(4))], path=path))

    # The composed locations must be the ones placements.json lists for every item.
    assert [k for k, _ in placed] == [i["part"] for i in meta["items"]], "tree and items disagree"
    worst = max(np.abs(m - np.asarray(i["location"])).max() for (_, m), i in zip(placed, meta["items"]))
    assert worst < 1e-4, f"composed locations differ from placements.json items by {worst}"

    # Tessellate each part key once; a board merges its layers in the board's frame.
    cache = {}

    def mesh_of(parts):
        vs, fs, n = [], [], 0
        for key, local in parts:
            if key not in cache:
                t = time.time()
                lin, ang, _ = tess(catalog.bom_line(key))
                cache[key] = tessellate(part_shape(key), lin, ang, key)
                print(f"  {key}: {len(cache[key][0])} verts, {len(cache[key][1])} tris ({time.time() - t:.1f} s)", flush=True)
            v, f = cache[key]
            vs.append(v @ local[:3, :3].T + local[:3, 3])
            fs.append(f + n)
            n += len(v)
        return weld(np.vstack(vs), np.vstack(fs))

    geoms, mesh_index = [], {}
    for inst in instances:
        gkey = inst["line"] if len(inst["parts"]) > 1 else inst["parts"][0][0]
        if gkey not in mesh_index:
            mesh_index[gkey] = len(geoms)
            geoms.append((gkey, *mesh_of(inst["parts"]), tess(inst["line"])[2]))
        inst["mesh"], inst["geom"] = mesh_index[gkey], gkey
        fam, asm = GROUP[inst["line"]]
        if fam == "electronics" and any(p.startswith("VS_PCB_COMPLETE") for p in inst["path"]):
            asm = SENSE
        inst["family"], inst["assembly"], inst["id"] = fam, asm, inst["line"]

    # Number repeated parts in tree order, then lay the nodes out family by family.
    count = defaultdict(int)
    for inst in instances:
        count[inst["id"]] += 1
        inst["n"] = count[inst["id"]]
    nodes = [{"name": "Longshot Battery Pack", "rotation": [-0.5 ** 0.5, 0, 0, 0.5 ** 0.5], "children": []}]

    def add(node, parent):
        nodes.append(node)
        nodes[parent].setdefault("children", []).append(len(nodes) - 1)
        return len(nodes) - 1

    for fam, label in FAMILIES.items():
        members = sorted((i for i in instances if i["family"] == fam), key=lambda i: (order[i["line"]], i["n"]))
        if not members:
            continue
        fam_node = add({"name": label}, 0)
        groups = {}
        for inst in members:
            if inst["assembly"] and inst["assembly"] not in groups:
                groups[inst["assembly"]] = add({"name": inst["assembly"]}, fam_node)
            m = inst["frame"].copy()
            m[:3, 3] /= 1000  # mm -> m
            name = inst["id"] if count[inst["id"]] == 1 else f"{inst['id']} {inst['n']}"
            add({"name": name, "mesh": inst["mesh"], "matrix": [round(x, 9) for x in m.T.reshape(-1)]},
                groups.get(inst["assembly"], fam_node))
    raw.parent.mkdir(parents=True, exist_ok=True)
    write_glb(raw, nodes, geoms)

    # Bounding box of the placed geometry, checked against the Fusion assembly.
    lo, hi = np.full(3, np.inf), np.full(3, -np.inf)
    for inst in instances:
        v = geoms[inst["mesh"]][1] @ inst["frame"][:3, :3].T + inst["frame"][:3, 3]
        lo, hi = np.minimum(lo, v.min(0)), np.maximum(hi, v.max(0))
    size = hi - lo
    ref = meta["source"]["size"]
    assert np.allclose(size, ref, atol=0.5), f"bbox {size} differs from the Fusion assembly {ref}"

    # Manifest: one entry per BOM line, in BOM order.
    commit = subprocess.run(["git", "-C", str(checkout), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    parts = []
    for row in bom:
        line = row["Part number"]
        mine = [i for i in instances if i["line"] == line]
        if len(mine) != int(row["Qty"]):
            sys.exit(f"{line}: BOM says {row['Qty']}, the assembly places {len(mine)}")
        name, note = split_description(row["Description"])
        notes = [note[0].upper() + note[1:]] if note else []
        by_geom, by_asm = defaultdict(list), defaultdict(list)
        for i in mine:
            by_geom[i["geom"]].append(i["n"])
            by_asm[i["assembly"]].append(i["n"])
        if len(by_geom) > 1:
            notes.append("Model: " + "; ".join(f"instances {spans(n)} are {g}" for g, n in by_geom.items()))
        if len(by_asm) > 1:
            notes.append("Model: " + "; ".join(f"instances {spans(n)} in {a}" for a, n in by_asm.items()))
        layers = [k for k in meta["parts"] if k.startswith(line + ":") and not meta["parts"][k].get("reference")]
        left_out = sorted({re.sub(r"^(SL|VS)_PCB_|__\d+_$", "", k.split(":")[1]) for k in layers})
        if left_out:
            notes.append(f"Model: {' and '.join(left_out)} layers are not committed, so not in the model")
        step = next((s.strip() for s in row["Reference / export"].split(";") if s.strip().endswith((".step", ".step.gz"))), None)
        part = {"id": line, "name": name, "qty": len(mine), "family": GROUP[line][0],
                "kind": "cots" if row["Make/buy"] == "buy" else "custom"}
        if row["Material"]:
            part["material"] = row["Material"]
        part["bomRef"] = line
        if step:
            part["step"] = f"{CAD}/{step}"
        if notes:
            part["note"] = ". ".join(notes)
        parts.append(part)
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "source": {"repo": REPO_URL, "commit": commit, "path": CAD},
        "units": "m",
        # Size in the model's axes (Y up): x across, y height, z along the pack.
        "bbox": {"x": round(size[0], 1), "y": round(size[2], 1), "z": round(size[1], 1)},
        "families": [{"id": fam, "label": label, "parts": [p["id"] for p in parts if p["family"] == fam]}
                     for fam, label in FAMILIES.items() if any(p["family"] == fam for p in parts)],
        "parts": parts,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    tris = sum(len(geoms[i["mesh"]][2]) for i in instances)
    print(f"{len(instances)} part instances, {len(geoms)} meshes, "
          f"{sum(len(g[1]) for g in geoms)} verts / {sum(len(g[2]) for g in geoms)} tris stored, {tris} drawn; "
          f"bbox {size[0]:.1f} x {size[1]:.1f} x {size[2]:.1f} mm (CAD X x Y x Z); {raw.stat().st_size / 1e6:.1f} MB raw "
          f"[{time.time() - t0:.0f} s]")


if __name__ == "__main__":
    main()
