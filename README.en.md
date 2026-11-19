# Kickoff Kit v0.2

[繁體中文](README.md) | **English**

This is the kickoff kit for the campus indoor navigation system (starting with Engineering Building #5). **All data inside is sample (fake) data.** Its purpose is to let every team start working before the real data arrives; when the real data comes in, just replace it, with no code changes. The sample room codes (`M101`…) are only for demonstration and do not represent the actual room codes of Engineering Building #5.

> Full specification: [docs/spec.en.md](docs/spec.en.md) (English translation) and [docs/spec.md](docs/spec.md) (Traditional Chinese, the authoritative version). If you have questions or want to change the spec, ask the integrators.

## Developer Guide

Before starting implementation, every developer on this project should read the team guidelines, the system architecture, and the development specification of their own team.

### 1. Team Collaboration Guidelines

- [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) — Git branches, Pull Requests, Code Review, testing, and cross-team collaboration rules.

All developers must follow this document.

### 2. System Architecture and Technology Stack

- [System Architecture](./docs/architecture/System_Architecture.en.md) — System architecture, how the five teams' modules relate, and the Android / Three.js integration.
- [Technology Stack](./docs/architecture/Technology_Stack.en.md) — Programming languages, frameworks, dependencies, and version rules.

Develop according to the unified technology stack, and do not change shared dependencies in ways that affect other teams.

### 3. Team Development Specifications

Read the development specification of your own team:

| Team | Development specification |
|---|---|
| Map Team | [Map Team](./docs/development/Map_Team_Development.en.md) |
| Localization Team | [Localization Team](./docs/development/Localization_Team_Development.en.md) |
| Route Team | [Route Team](./docs/development/Route_Team_Development.en.md) |
| 3D Team | [3D Team](./docs/development/3D_Team_Development.en.md) |
| UI Team | [UI Team](./docs/development/UI_Team_Development.en.md) |

Each team may decide its own internal implementation, but it must comply with its development specification and the cross-team interface contracts.

### 4. Shared Cross-team Specifications

When your work involves another team's data or functions, you must refer to:

- [Data Specification](./docs/interfaces/schemas/Data_Specification.en.md) — The eight unified data formats.
- [Function Interface](./docs/interfaces/functions/function.en.md) — Input, output, and usage conditions of cross-team Functions.

No single team may change a cross-team interface on its own.

### 5. Development Workflow

1. Read the team guidelines and technology stack of this project.
2. Read the development specification of your own team.
3. Identify the cross-team data and Functions you need to use.
4. Implement on a development branch.
5. Run basic tests when the feature is complete.
6. Open a Pull Request to `master`.
7. Merge only after the required checks pass and at least one reviewer who is not the author approves.

Changes to the unified data specification, cross-team Functions, or the technology stack must first be coordinated with the affected teams.

> The Chinese documents are authoritative; the `.en.md` files are translations.

## Prerequisites

- Install Node.js 18 or later (the latest version also works). Tested with Node 22.
- No `npm install` is needed; this kit has no external packages.

## Quick start (one minute)

```bash
npm run validate     # validate the data under data/ (V1–V10)
npm test             # run the Route team's tests
npm run gen-sample   # regenerate the sample data (overwrites data/)
npm run serve        # start a local server (127.0.0.1:8080) to view the 3D demo
```

To see the 3D demo: run `npm run serve`, then open <http://127.0.0.1:8080/examples/viewer3d-demo.html> in a browser.
**Do not double-click the HTML file**, because the page uses `fetch` to read data and loads ES modules. Three.js for the 3D view is loaded from the network, so you need an internet connection.

Without npm, run the commands directly: `node tools/validate-data.js data`, `node --test`, `node tools/serve.js . 8080`.

## Folders and files

| Path | Contents | Used by |
|---|---|---|
| `data/svg/floor-1..3.svg` | Sample floor plans (3 floors, format per spec 4.1) | Map, UI, 3D |
| `data/graph.json` | Sample graph (88 nodes, 89 edges, format per spec 4.2) | Route, UI |
| `data/rooms.csv` | Room table (spec 4.3) | UI |
| `data/building.json` | Floors and floor height (spec 4.4) | All |
| `src/route/findRoute.js` | **A first version already exists for the Route team**: A* is implemented and passes 12 hand-computed tests | Route, UI |
| `src/route/findRoute.test.js` | Tests (hand-computed expected values) | Route |
| `src/route/findRoute.stub.js` | Stub function (for the UI team to use first) | UI |
| `src/viewer3d/createViewer3D.js` | **A first version already exists for the 3D team**: reads the standard SVG and implements every function in spec 4.6 | 3D, UI |
| `src/viewer3d/viewer3d.stub.js` | Stub 3D component (for the UI team to use first) | UI |
| `src/position/position.stub.js` | Stub positioning module (for the UI and 3D teams to use first) | UI, 3D |
| `tools/validate-data.js` | Data validator V1–V10 | Map team (must run before submitting), Integration team |
| `tools/gen-sample-data.js` | Sample data generator | Integration team |
| `tools/serve.js` | Local static server (binds to 127.0.0.1 only) | 3D, UI |
| `sensor-data/runs.csv`, `marks.csv` | Empty templates for sensor data (spec 4.8) | Sensors team |
| `docs/spec.md` | Full specification (Traditional Chinese, the authoritative version) | All |
| `docs/spec.en.md` | English translation of the full specification | All |
| `docs/decisions.md` | Decision log (only the integrators edit it) | All |
| `docs/templates/` | Phone inventory, on-site measurement sheet, and weekly status templates | Each team |
| `examples/viewer3d-demo.html` | 3D component demo page (uses the real `findRoute`, can switch between 2D and 3D, can test `dispose`) | 3D, UI |
| `examples/legacy-demo-simple-svg.html` | The earliest prototype, using a simplified SVG format; **for reference only, do not use** | — |

## How each team gets started

**Map Data Team**
1. Read spec chapters 3 and 4, and section 5.2.
2. Look at how `data/svg/floor-1.svg`, `data/graph.json`, and `data/rooms.csv` are written.
3. Go measure on site using `docs/templates/measurement-sheet.md`.
4. When you are done, put the files in `data/`, run `npm run validate`, and **open a PR only when everything passes**.

**Route Algorithm Team**
1. Read spec 4.2, 4.5, and 5.3.
2. `src/route/findRoute.js` is already a working A*. Your job: once the real data arrives, recompute the expected test values by hand, add more tests, check performance, and handle edge cases.
3. Note: the expected values in `findRoute.test.js` were computed by hand from the **sample data**. They must be recomputed when the real data arrives, not reused as they are.

**UI Team**
1. Read spec 4.4–4.7 and 5.4.
2. Start with `findRoute.stub.js`, `viewer3d.stub.js`, and `position.stub.js`; their interfaces match the real ones.
3. Read data only from `data/` (SVG, `rooms.csv`, `graph.json`). Do not hard-code room codes in the code.

**3D Team**
1. Read spec 4.1, 4.6, and 5.5.
2. `src/viewer3d/createViewer3D.js` can already read the standard SVG and implements all the functions in 4.6. Run `npm run serve` and open the demo page to see it.
3. Your job: after switching to the real SVG, check the appearance, handle irregular shapes and staircase directions, test performance on a real iPhone, and write `src/viewer3d/README.md`.
4. The "重建 10 次" (rebuild 10 times) button on the demo page checks whether `dispose()` leaks resources (the canvas count should stay at 1).

**Sensors and Positioning Team**
1. Read spec 4.7, 4.8, and 5.6.
2. Start E1 with `docs/templates/phone-inventory.md`.
3. Put data files in `sensor-data/raw/` (create it yourself), and register them in `runs.csv` and `marks.csv`.
4. Use the interface of `src/position/position.stub.js` as the starting point for the positioning module.

## Known limitations (please read first)

- Everything under `data/` is **fake data**. `building.json` has `"sample": true`, so validation shows a warning. Remove this field when you switch to real data.
- The validator's SVG parsing is simple text parsing: it only recognizes `<polygon>` and `<line>`, and does not support `transform`, `<path>`, or `<rect>`. When exporting from Inkscape, convert shapes to polygons and apply any transforms.
- `viewer3d.stub.js` and `createViewer3D.js` need a browser environment; all other files run in plain Node.
- **`createViewer3D.js` has only been tested in a desktop browser (the built-in browser)**: loading, floor switching, exploded view, routes, user position, clicking rooms, 2D/3D switching, rebuilding 10 times with `dispose`, and error codes. **It has not been tested on iPhone Safari yet**; performance and gestures must be confirmed on a real device.
- The 3D view assumes rooms are simple shapes on both sides of a corridor. Staircase steps always run along the x direction, and the stairs and elevator are only illustrative.
- `docs/spec.md` and `docs/spec.en.md` are snapshots of the document. If the spec is updated, the integrators must sync both copies.
- The cross-floor edge lengths for stairs and elevators (stairs 8, elevator 5) are default values, not measurements.
- Sensor data recording, analysis scripts, and the positioning algorithm **do not exist yet**; this kit only provides formats and templates.
