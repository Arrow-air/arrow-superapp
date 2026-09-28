# Spearhead model for the workspace

`spearhead-v2.glb` is a web copy of the Spearhead aircraft review model from
[project-spearhead](https://github.com/Arrow-air/project-spearhead/tree/hex/build123d-fusion-aircraft/src/design)
(branch `hex/build123d-fusion-aircraft`, commit `bca111d`, revision `center-ribs-rear-gear-v2`,
Fusion snapshot 2026-09-26). It is a tessellated preview of the Build123D reconstruction; the STEP
files in that repository are the exact geometry. Blue parts are inferred (mirrored), teal parts
were recovered from bodies hidden in the Fusion file.

To regenerate from the viewer's `assets/spearhead-v2.glb` (about 20 MB):

```sh
npm i --no-save @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer
npm run model:convert -- path/to/spearhead-v2.glb public/models/spearhead/spearhead-v2.glb
```

The converter merges Fusion's per-face primitives into one per solid (13,033 → 316), keeps the
named subsystem › component › solid hierarchy that discussion anchors use, then welds and
meshopt-compresses it (about 3.3 MB). Copy `model.json` alongside it, and bump `MODEL_ID` in
`src/workspace/model.ts` when the geometry changes so anchors can tell.
