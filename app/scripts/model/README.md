# 3D models

`public/quiver.glb` and `public/longshot.glb` are exported from each project's build123d CAD by the scripts here, then compressed by `convert.mjs`.

| Script | Does |
| --- | --- |
| `export_quiver.py` | Builds the Quiver Dev Kit assembly as `quiver.assembly.make_assembly` does, tessellates each distinct part once and writes a raw GLB with the tree the model page reads. |
| `export_longshot.py` | Rebuilds the Longshot main assembly as `longshot.assembly` does (every leaf of the Fusion tree in `placements.json`, parametric custom parts, committed reference STEPs for purchased and PCB parts), tessellates each distinct part once and writes a raw GLB plus the manifest. |
| `convert.mjs` | Welds, simplifies the meshes the exporter marked, and meshopt-compresses. |
| `check.mjs` | Loads the Longshot GLB with three.js's GLTFLoader, as the viewer does, and checks it against the manifest. |

## Quiver

`public/quiver.glb` was built from [Arrow-air/project-quiver](https://github.com/Arrow-air/project-quiver) main at `7ea076a` (the PR #267 merge, October 30, 2026) with build123d 0.10.0 on Python 3.12. Rebuild it whenever the CAD on main changes, and refresh the BOM facts from the same checkout:

```sh
# A checkout of main, and a Python with the repo's pinned CAD dependencies (as its CI installs them)
git clone --depth 1 https://github.com/Arrow-air/project-quiver /tmp/quiver-model/repo
python3.12 -m venv /tmp/quiver-model/.venv
/tmp/quiver-model/.venv/bin/pip install -e "/tmp/quiver-model/repo/src[dev]" -c /tmp/quiver-model/repo/src/constraints.txt
# The glTF tools, outside the app (they are not app dependencies)
npm i --prefix /tmp/quiver-model @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer

# From app/
/tmp/quiver-model/.venv/bin/python scripts/model/export_quiver.py /tmp/quiver-model/repo /tmp/quiver-model/quiver-raw.glb
GLTF_TOOLS=/tmp/quiver-model node scripts/model/convert.mjs /tmp/quiver-model/quiver-raw.glb public/quiver.glb
git clone --depth 1 https://github.com/Arrow-air/quiver-sdk /tmp/quiver-model/sdk
QUIVER_SRC=/tmp/quiver-model/repo QUIVER_SDK=/tmp/quiver-model/sdk npm run data
```

The export takes about a minute. It stops if a placed part has no BOM line, or if the model's extent is more than 0.5 mm off the CAD's (`BBOX_MIN`/`BBOX_MAX` in the repo's `src/tests/test_assembly.py`). When a release adds or renumbers parts, check `zoneForPart` in `src/data/model.ts` and the zone part lists in `src/data/zones.ts`.

- Meters, Y up: the CAD's Z-up turned by -90° about X on the root node, CAD origin kept.
- `Quiver Drone` > category (Airframe Structure, Supporting Structure, Equipment, Harness) > subassembly (Plates, Beams, Landing Gear …; the busbars sit directly under Harness) > one node per placed part, named by its CAD label: `1111_upper_plate`, `1310-VerticalTube`. Its first four digits are the BOM number the app keys parts on (`partOf` in `src/projects/models.ts`). Repeated parts share one mesh and keep the same name.
- The primary GPS is the CAD's default (`make_assembly()` without `primary_gps`): the Holybro NEO-F9P on mount 2331. The Here4 alternative and its mount 2333 are BOM lines, not drawn.
- Positions only, no normals, UVs or materials: the viewer shades flat. Vendor models with hundreds of bodies (motors, PCBs, battery, sensors) are tessellated coarser and simplified (`TESS` in the exporter).
- Left out: fasteners, including the screws, threaded inserts and rubber spacers modeled inside the 2311 adapter STEP (only the printed adapter is kept), and a few vendor-model faces OCCT cannot mesh (one on the 2412 top cap, nine on the LiDAR, six on the main PCB, four on the battery).

## Longshot

`public/longshot.glb` and `src/data/generated/longshot-model.json` come from the build123d model in [Arrow-air/project-longshot](https://github.com/Arrow-air/project-longshot) (`engineering/cad/build123d`). The current files were built from commit `f7ec9a7` (the PR #27 merge) with build123d 0.10.0 on Python 3.12.10.

### Regenerate

```sh
# A checkout, and a Python with build123d 0.10 (made from the repo's requirements.txt)
git clone https://github.com/Arrow-air/project-longshot /tmp/longshot-model/repo
python3 -m venv /tmp/longshot-model/.venv
/tmp/longshot-model/.venv/bin/pip install -r /tmp/longshot-model/repo/engineering/cad/build123d/requirements.txt
# The glTF tools, outside the app (they are not app dependencies)
npm i --prefix /tmp/longshot-model @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer

# From app/
/tmp/longshot-model/.venv/bin/python scripts/model/export_longshot.py /tmp/longshot-model/repo /tmp/longshot-model/longshot-raw.glb src/data/generated/longshot-model.json
GLTF_TOOLS=/tmp/longshot-model node scripts/model/convert.mjs /tmp/longshot-model/longshot-raw.glb public/longshot.glb
node scripts/model/check.mjs public/longshot.glb src/data/generated/longshot-model.json
```

The export takes about 30 seconds. It stops if the composed placements differ from `placements.json`, if the bounding box is more than 0.5 mm off the Fusion assembly (249.0 × 346.5 × 138.8 mm), or if a BOM line has no family or a different count from the BOM. A new BOM line needs a row in `GROUP`.

### The file

- Meters, Y up: the CAD's Z-up turned by -90° about X on the root node, CAD origin kept, the same as `quiver.glb`.
- `Longshot Battery Pack` > family > assembly (only in Enclosure, Mounting and Electronics) > one node per placed part > its mesh. Families: Cells, Cell holders, Busbars, Enclosure (Plates, Reinforcements, Base and top cover), Mounting (Strap, Tattu clip, Inserts), Electronics (Main board, Voltage-sense boards).
- Part nodes are named by their BOM.csv part number, plus a space and an instance number when the part repeats: `PW-CELL-001-21700 17`, `EN-PC-001-Top_Plate`. That part number is the id the app keys parts on (`partOf` in `src/projects/models.ts`); in the manifest `id` and `bomRef` are both that part number. No part number is a prefix of another.
- Instances are numbered in Fusion tree order. Fusion's `PW-BUS-003-Bridge_1_Mirror` rolls up into `PW-BUS-003-Bridge_1` as in the BOM (instances 7-12, the bottom of the pack). Each PCB's layers (board, pads, soldermask) are one mesh. Positions only, no normals, UVs or materials: the viewer shades flat.
- In the manifest, `kind` follows BOM.csv's make/buy (`buy` is `cots`, so cells are COTS and the PCBs custom), `step` is the repo path of the part's STEP export or reference STEP, and `bbox` is the size in mm along the file's axes (x across, y up, z along the pack).

### Left out

- PCB copper and silkscreen: not committed to the repo, so the build123d assembly leaves them out too.
- Two 0.4 mm² conical faces of the `CONN-TH_430451612` vendor model, which OCCT cannot mesh.
- Detail: tessellation is coarse on purpose (`TESS` in the exporter). Cells have about 26 segments around; inserts, SMD fuses and SMD connectors, drawn many times and mostly hidden, are simplified further.
