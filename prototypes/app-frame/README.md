# app-frame

**Question:** can one app frame (bar, section nav, wallet, side panel, page header) host every Arrow module reliably, so presentation can be designed separately from the features that go inside it?

**Worked would look like:** any page drops into the content slot by declaring `title`, `section` and `panel` on its route, and the frame handles navigation, loading, errors, the side panel and phone to desktop widths without knowing what the page renders. A page that crashes shows an error in the slot while the rest of the app keeps working.

Same stack as `spec-threads` and `quiver-app` (Vue 3, Vite, vue-router, hash routing), so their pages can move under the frame later.

## Run

```
npm install
npm run dev
```

`#/broken` loads a page that throws on purpose, to check error containment.

## Structure

| Path | What it is |
|---|---|
| `src/App.vue` | The frame layout and the content slot |
| `src/frame/` | Frame pieces: bar, mobile nav, wallet, side panel, page header, slot states |
| `src/frame/sections.ts` | Top-level sections; nav and routes are generated from it |
| `src/styles/tokens.css` | All colours, type, spacing and frame geometry. Placeholders until the Figma variables are pulled in |
| `src/pages/` | Placeholder pages only |
