# quiver-app: one app for one aircraft (concept demo)

Clickable front end for the idea in `ideas/quiver-app.md`. Leads with "Build on Quiver": the airframe is done, the app's job is attachments, software and getting to market.

**Real, read-only:** BOM (96 parts), the task board (T-01 to T-18), open issues, funding lines as the repo states them, flight test records, guides, the payload spec, and the 3D assembly exported from the repo's build123d CAD (119 MB down to 1.7 MB, every mesh resolves to a BOM id).
**Pretend, and marked so on screen:** votes, personas (roles, not people), threads on parts, claims, the co-written spec, dependency links between decisions. All in `src/data/pretend.ts`. Nothing writes to GitHub.

Things the demo had to fake, which are findings in themselves:
- No issue names a BOM id, so part to work links are by keyword (`scripts/build-data.mjs`, `PART_KEYWORDS`).
- The decision register is empty. T-09 funds writing it. The Standing table shows BOM facts with "why: not written".
- Only QGB-05 has a budget stated in the repo. Paid amounts are nowhere.

```
npm install
npm run data     # needs a project-quiver checkout (QUIVER_SRC) and quiver-sdk (QUIVER_SDK), plus gh
npm run build && npm start
node e2e/shots.cjs shots   # screenshots of every screen
```
The 3D model is rebuilt outside this repo: `make_assembly()` → `export_gltf` → gltf-transform (merge per-face primitives per part, weld, simplify, meshopt).
