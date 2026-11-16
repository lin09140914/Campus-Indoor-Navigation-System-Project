# Campus Indoor Navigation System: Team Split and Specification v0.2

[繁體中文](spec.md) | **English**

> This is the English translation of [spec.md](spec.md), which is written in Traditional Chinese. **If the two versions differ, the Chinese version is the authoritative one**; please tell the integrators so we can fix it. When the Chinese spec changes, this translation has to be updated too.
>
> This document is the specification shared by the whole team. As long as each team delivers according to the "interface specifications," it does not need to wait for the other teams.
> If you have questions about the spec or want to change it, always go to the integrators, and record the change in the change log at the end.
> Numbers marked "suggested" are starting values, not final answers. You may adjust them after trying them out, but record the reason for the adjustment.

---

## 1. Project Goal and Scope

**One-sentence goal:** Without installing any hardware, let users look up in an iPhone browser "where a room is and how to get there" inside Engineering Building #5.

> Note: The progress report originally said the Mathematics Building. Because all the new members are Computer Science students, we switched to Engineering Building #5. See `docs/decisions.md`.

**What the first version (MVP) must do:**
- Show the floor plan of every floor of Engineering Building #5, with floor switching
- The user chooses a start and a room; the system computes the shortest route and draws it on the map, including across floors (stairs or elevator)
- The start can be set manually

**Second phase (only after the MVP is done):**
- 3D view (switchable with 2D)
- Track the position with the phone's sensors (step counting, direction, corner and stair corrections)

**Explicitly out of scope (unless the integrators agree in writing):**
- QR codes, or anything that has to be posted or installed inside the building
- A native iOS app (it needs a Mac, Xcode, and a developer account, so the risk is too high)
- Wi-Fi signal positioning (ordinary iOS apps cannot read it)
- Whole-campus coverage; the first version covers only Engineering Building #5 (after visiting the site, decide which floor or which area to do first; do not start with the whole building)

**Platform assumption:** Users are assumed to use iPhones and open the web page in Safari. Therefore:
- The accelerometer, gyroscope, and compass can be read, but this requires HTTPS, and the permission can only be requested after the user taps.
- The barometer and Wi-Fi signal strength cannot be read by an iOS web page, so the product does not depend on them.
- A web page's sensors may stop when the screen turns off or the page goes to the background (the Sensors and Positioning Team has to verify this), so users must be reminded to keep the screen on while navigating.

---

## 2. Teams and Dependencies

The headcounts are a suggested split for 11 people (2 integrators plus 9 new members) and can be adjusted to the actual situation.

| Team | Suggested size | One-sentence mission | Main deliverables |
|---|---|---|---|
| Integration Team | 2 | Define the spec, integrate, do quality control, write documents | This document, the repository, the validation script, the weekly integrated build |
| Map Data Team | 3 | Turn Engineering Building #5 into data | `floor-N.svg`, `graph.json`, `rooms.csv` |
| Route Algorithm Team | 1 | Compute the shortest route | The `findRoute()` module and its tests |
| UI Team | 2 | Build the web pages users see | The web interface (2D map, menus, route display) |
| 3D Team | 1 | Build an embeddable 3D viewer | The `createViewer3D()` component |
| Sensors and Positioning Team | 2 | Collect sensor data, build a positioning prototype | A dataset, an evaluation report, a positioning module |

**Dependencies:**

```
Map Data Team ──(SVG, graph.json, rooms.csv)──► Route team, UI Team, 3D Team, Sensors team (checkpoints)
Route team    ──(findRoute)────────────────► UI Team
3D Team       ──(createViewer3D)───────────► UI Team
Positioning   ──(position output)──────────► UI Team, 3D Team
```

**Principle for avoiding blocking each other:** Each downstream team first develops with the **sample data and stub functions** provided by the Integration Team. When the upstream team delivers the real data, it is swapped in directly, with no code changes.

---

## 3. Common Rules

### 3.1 Coordinates and units
- The unit of length is always the **meter**. One unit in the SVG equals one meter.
- Origin of each floor: the top-left corner of the building outline is `(0, 0)`; `x` points right (east), and `z` points down (the SVG's `y`).
- 3D world coordinates: `x = x`, `z = z`, `y` points up, and `y = (floor - 1) × floor height`.
- All floors share the same plan origin; the stairs and elevators must have the same `(x, z)` on every floor.
- Floors are integers: `1`, `2`, `3`; basements are negative numbers (`-1`).

### 3.2 Naming
- Room codes: use the actual room codes shown on the building. The `M116` used in this document and in the sample data is only a demonstration; **the actual room code format of Engineering Building #5 is whatever is on site**. The spec only requires uppercase letters and digits with no spaces. If the actual codes contain symbols or spaces, ask the integrators to adjust the rule first.
- Stairs and elevators: `STAIR-A`, `ELEV-A`. The same stairwell or elevator shaft uses the **same id** on every floor; the system uses this to tell that it is the same one.
- Node ids: see 4.2.
- File names: lowercase English with hyphens, for example `floor-1.svg`, `graph.json`, `rooms.csv`.

### 3.3 Repository structure (suggested)

```
/data/
  svg/floor-1.svg  floor-2.svg ...
  graph.json
  rooms.csv
  building.json          # floor height, unit, version
/src/
  route/                 # Route Algorithm Team
  ui/                    # UI Team
  viewer3d/              # 3D Team
  position/              # Positioning
/tools/
  validate-data.js       # data validation script (Integration Team)
/sensor-data/
  raw/                   # raw data, must not be modified
  processed/
  runs.csv
  marks.csv
/docs/
  spec.md                # this document (Traditional Chinese)
  spec.en.md             # English translation
  decisions.md           # decision log
```

### 3.4 Git workflow
- `master` is always a working version and **can only be changed through a Pull Request**.
- Branch names: `team/short-description`, for example `map/floor1-svg`, `route/astar-core`.
- Every PR needs a review from at least one integrator before it can be merged.
- Commit messages should make clear what was done (for example, "add corridor nodes for floor-1").
- Raw measurement data and raw sensor data **must not be overwritten**; to change them, add a new copy and explain.

### 3.5 Definition of "done"
A piece of work counts as done only if all of the following are true:
1. The deliverable matches the corresponding spec in this document.
2. All acceptance criteria pass (listed in each team's section).
3. There is a short note (how to use it, known limitations) in the `README.md` of that team's folder.
4. It has been merged into `master`.

### 3.6 Meetings and decisions
- **Progress report every Thursday** (suggested 45 to 60 minutes). Each team gets about 5 minutes and says only three things: what was finished, where it is stuck, and who does what next week, with something to show (a link or a screenshot). On Friday, bring the report summary to class to discuss with the instructors. See chapter 7.
- Ordinary details are decided by each team's lead; **spec and scope questions that cross teams are decided by the integrators**, and written into `docs/decisions.md`:

```
## YYYY-MM-DD Title
- Decision:
- Reason:
- Teams affected:
```

- New ideas go onto the "backlog" first and are not scheduled for development before the MVP is done.

### 3.7 Tech stack (suggested; the integrators make the final call)
- Plain web: HTML and JavaScript (ES modules), with no large framework, so that everyone can read the code.
- Three.js for 3D; A* is a small module we write ourselves, with no large library.
- Deploy somewhere that provides HTTPS, such as GitHub Pages (iOS needs HTTPS to read sensors).
- Testing: Node's built-in `node --test` is enough.
- Pure-logic modules such as routing and positioning **must not depend on browser APIs**, so that they can be tested and replayed in Node.

---

## 4. Interface Specifications

This chapter is the "contract" between the teams. Tell the integrators before changing anything in it.

### 4.1 Floor plan SVG (`data/svg/floor-N.svg`)

One file per floor. The unit of the `viewBox` is meters.

| Element | How to write it | Description |
|---|---|---|
| Building outline | `<polygon class="outline" points="...">`, exactly one | The outer outline of the whole floor |
| Room | `<polygon class="room" id="M116" points="...">` | The area of the room; `id` is the room code |
| Door | `<line class="door" data-room="M116" x1 y1 x2 y2>` | A line segment on the room's wall; the midpoint of the segment is the position of the doorway |
| Corridor | `<polygon class="corridor" points="...">` | For display only; there can be several |
| Stairs | `<polygon class="stair" id="STAIR-A" points="...">` | The same staircase uses the same id on every floor |
| Elevator | `<polygon class="elevator" id="ELEV-A" points="...">` | Same as above |

Example:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20">
  <polygon class="outline" points="0,0 40,0 40,20 0,20"/>
  <polygon class="room" id="M116" points="5,1 11,1 11,8.5 5,8.5"/>
  <line class="door" data-room="M116" x1="7.3" y1="8.5" x2="8.7" y2="8.5"/>
  <polygon class="stair" id="STAIR-A" points="36,8.5 39,8.5 39,11.5 36,11.5"/>
</svg>
```

> Note: The earliest example, `legacy-demo-simple-svg.html`, uses a simplified format (rectangles plus a `data-door` direction to represent doors). **It is not the format of this spec; it is kept for reference only, so please do not use it.** `src/viewer3d/createViewer3D.js` and `examples/viewer3d-demo.html` in the kickoff kit have been changed to read the standard format in this section.

### 4.2 `data/graph.json`

```json
{
  "version": 1,
  "building": "eng5",
  "unit": "m",
  "nodes": [
    { "id": "M116",       "x": 8.0, "z": 4.75, "floor": 1, "type": "room" },
    { "id": "M116#door",  "x": 8.0, "z": 8.5,  "floor": 1, "type": "door" },
    { "id": "F1-C-008",   "x": 8.0, "z": 10.0, "floor": 1, "type": "corridor" },
    { "id": "STAIR-A@1",  "x": 37.5,"z": 10.0, "floor": 1, "type": "stair" },
    { "id": "STAIR-A@2",  "x": 37.5,"z": 10.0, "floor": 2, "type": "stair" }
  ],
  "edges": [
    { "a": "M116", "b": "M116#door", "w": 3.75, "kind": "walk" },
    { "a": "STAIR-A@1", "b": "STAIR-A@2", "w": 8.0, "kind": "stair" }
  ]
}
```

**Field rules:**
- `type`: `room`, `door`, `corridor`, `stair`, `elevator`, `entrance`.
- Node ids: a room uses its room code; a door uses `<room code>#door`; a corridor node uses `F<floor>-C-<sequence number>`; stairs and elevators use `<shaft id>@<floor>` (the id of the stairwell or elevator shaft, followed by the floor).
- `kind`: `walk` (walking), `stair` (stairs), `elev` (elevator).
- **The `w` of a walk edge must not be smaller than the straight-line distance between its two endpoints**; otherwise the A* heuristic becomes inaccurate (it could overestimate the remaining distance). Normally just set it to the straight-line distance.
- The `w` of a cross-floor edge (`stair`, `elev`) is the equivalent distance for going up one floor. Start with the default values (stairs 8, elevator 5), and adjust them later based on measurements.
- The graph is **undirected**; write each edge only once.

**Who produces it:** The Map Data Team. The Integration Team will later provide a small tool that turns an SVG into a draft of the nodes (not produced yet; see chapter 6), and the corridor nodes still have to be added by hand. For now, see `tools/gen-sample-data.js` for how the nodes and edges are put together.

### 4.3 `data/rooms.csv`

```csv
room_id,floor,name,type,node_id
M116,1,示範教室 M116,classroom,M116
M201,2,系辦公室,office,M201
```

- `type`: `classroom`, `office`, `lab`, `restroom`, `storage`, `other`.
- `node_id` corresponds to the room node in `graph.json`.
- The UI's dropdown menus and search rely entirely on this file.

### 4.4 `building.json`

```json
{ "id": "eng5", "name": "工程五館", "floors": [1, 2, 3], "floorHeight": 4.0, "unit": "m" }
```

`floorHeight` must be replaced with the **measured value**.

### 4.5 Route function `findRoute`

```js
findRoute(graph, fromRoomId, toRoomId, mode)
// mode: 'any' | 'stair' | 'elev'
// Returns:
{
  path: [ { id, x, z, floor, type }, ... ],   // nodes passed through, in order
  length: 55.5,                                // total distance (meters)
  floors: [1, 3],                              // start floor, destination floor
  via: 'elev'                                  // 'stair' | 'elev' | null (same floor)
}
// If no route is found, or the room code does not exist: returns null
```

- This is a **pure function**; it does not touch the web page.
- When the start equals the destination, it returns a `path` with a single node and a `length` of 0.

### 4.6 3D viewer component `createViewer3D`

```js
const viewer = createViewer3D(containerElement, { svgs, building });

viewer.setFloor('all' | 1 | 2 | 3);                 // which floors to show
viewer.setExplode(meters);                           // gap for the exploded view
viewer.highlightRoom(roomId, 'start' | 'goal' | null);
viewer.showRoute(routeResult);                       // takes the return value of findRoute directly
viewer.setUserPosition({ x, z, floor, confidence });
viewer.onRoomClick(roomId => {});
viewer.dispose();
```

### 4.7 Positioning module output

```js
const pos = createPositioning(graph);
pos.startAt({ nodeId } | { x, z, floor });   // start: chosen by the user, or the entrance
pos.confirm(nodeId);                         // the user confirms "I am here"
pos.reset({ x, z, floor });                  // manual reset
pos.onUpdate(state => {});                   // keeps reporting the state
pos.feed(sample);                            // feed one sensor sample (shared by replay and live use)
pos.stop();

// state:
{
  x, z, floor,
  confidence: 'confirmed' | 'estimated' | 'lost',
  distSinceConfirm: 12.4,    // meters walked since the last confirmation
  ts: 1731300000000
}
```

Format of `feed(sample)`: `{ t, ax, ay, az, gx, gy, gz, heading }`. The units are defined in 4.8: acceleration in m/s², angular velocity in rad/s, `heading` in degrees (0 = north, increasing clockwise), and `t` in milliseconds relative to the start of the recording. This way the same module can replay recorded data offline and also work with real live sensors.

### 4.8 Sensor data format

**Units (final):**
- Acceleration: `m/s²`
- Angular velocity: `rad/s`
- Direction `heading`: degrees, 0 is true north, clockwise
- Air pressure: `hPa` (used only during collection)
- Time `t`: milliseconds, relative time within one recording (starting from 0)

**Raw file `sensor-data/raw/<file name>.csv`** (if the columns exported by the app differ, do not edit the raw file; write a conversion script that outputs to `processed/`):

```csv
t_ms,ax,ay,az,gx,gy,gz,heading,pressure_hpa
0,0.02,9.81,0.10,0.001,0.002,0.000,87.5,1013.20
```

**Marks file `sensor-data/marks.csv`:**

```csv
run_id,t_ms,event,ref
r001,12340,checkpoint,F1-C-008
r001,48210,stair_start,STAIR-A@1
r001,61200,stair_end,STAIR-A@2
```

`event` can be `checkpoint`, `stair_start`, `stair_end`, `elev_start`, `elev_end`, or `turn`.

**File name:** `date_personCode_phone_experimentId_route_runNumber.csv`, for example `1118_A_iPhone13_E2_corr20m_run3.csv`.

**Run summary table `sensor-data/runs.csv`:**

```csv
run_id,date,person,phone,placement,experiment,route,true_steps,true_distance_m,notes
r001,2026-11-18,A,iPhone13,hand,E2,corr20m,27,20.0,
```

### 4.9 Data validation rules (what `tools/validate-data.js` checks)

The Map Data Team must pass these before handing in anything. The Integration Team maintains the script.

| ID | Rule |
|---|---|
| V1 | Node ids in `graph.json` are unique |
| V2 | Every room code in `rooms.csv` exists in both the SVG and the graph, and the graph has the matching room node |
| V3 | Every room in the SVG has at least one `door` line segment |
| V4 | Both endpoints of every edge exist, and there are no duplicate edges |
| V5 | The `w` of a walk edge is not smaller than the straight-line distance between its endpoints (tolerance 1e-6) |
| V6 | Every room node can be reached from the entrance (or any designated base node); that is, the graph is connected |
| V7 | Node coordinates are inside the outline of their floor |
| V8 | A room node is inside its room polygon; a door node is on the room's edge (suggested tolerance 0.1 m) |
| V9 | Every stairwell or elevator shaft has a node with the same id on each adjacent floor, with the same `(x, z)`, and a cross-floor edge |
| V10 | The coordinate system of the outlines is consistent across the floor SVGs (top-left corner at `(0,0)`) |

---

## 5. Details for Each Team

The format of each team's section: **Goal → What the integrators provide before you start → How to do it → Deliverables → Acceptance criteria → Schedule → When you are stuck**.

### 5.1 Integration Team (2 people: the integrator and the partner)

**Goal:** Keep the other teams from being blocked, and make sure the deliverables fit together.

**Division of work:**
- The integrator: the spec, cross-team decisions, reviewing PRs, the weekly integration, and dealing with the instructors and outside parties (the department office).
- The partner: quality control and documentation. Maintain the validation script, the meeting notes, `decisions.md`, and the completeness of each team's README; help request the floor plans.

**The kickoff kit to provide to the other teams (see chapter 6).**

**Weekly routine:**
1. Wednesday evening: collect each team's progress and PRs (the suggested submission deadline).
2. Before the Thursday report: merge the PRs that passed acceptance, producing a demonstrable version of `master`.
3. After the Thursday report: write a one-page summary, and take it to class on Friday to discuss with the instructors.
4. After Friday's class: update `docs/decisions.md` and the change log, and confirm each team's tasks for the next week.

**Acceptance criteria:**
- Every team gets all of its inputs on the day it starts.
- `master` can be opened and demonstrated at any time.

### 5.2 Map Data Team (3 people)

**Goal:** Turn Engineering Building #5 into three standard files: `floor-N.svg`, `graph.json`, and `rooms.csv`. Get **one floor** working end to end first, then copy the approach to the others.

**What the integrators provide before you start:**
- Chapters 3 and 4 of this document
- Sample `floor-1.svg`, `graph.json`, and `rooms.csv` (fake data)
- The on-site measurement sheet (Appendix B)
- The validation script

**How to do it:**

1. **Gather sources (in parallel):**
   - Photograph the evacuation plan posted on the wall of each floor.
   - Request the official floor plans from the department office (the integrators help).
   - Measure the overall length and width of the building outline on Google Maps satellite imagery, as a scale check.
2. **Measure on site (each floor):**
   - Pick a fixed base point at one end of the corridor, and measure the **cumulative distance to the left and right edges of every door**; do not add up segment by segment.
   - Measure both sides of the corridor separately and record them separately; do not assume the two sides line up.
   - Room depth: shoot a laser distance meter from the doorway perpendicular to the back wall, or count floor tiles.
   - Measure the corridor width, the positions of the stairs and elevators, the floor height, and the room codes.
   - Measure every distance twice; if the two readings differ by more than 10 cm, measure again.
   - **Closure check:** the corridor width plus the depths of the rooms on both sides plus the wall thicknesses should roughly equal the total width of the building. The suggested limit for the difference is 0.3 m; if it is larger, find which measurement is wrong.
3. **Draw the SVG:** Use a tool such as Inkscape, follow the format in 4.1, and use the measured numbers (in meters). The evacuation plan is only a background reference; the dimensions follow the measurements.
4. **Build the graph:** List the nodes and edges following 4.2. Put the corridor nodes on the corridor centerline directly in front of each door, and at the corridor corners and ends.
5. **Room table:** Fill in `rooms.csv` following 4.3.
6. **Self-check:** Run `validate-data.js`; hand in your work only when everything passes.

**Deliverables:**
- `data/svg/floor-1.svg` (later 2F, 3F, ...)
- `data/graph.json`
- `data/rooms.csv`
- `data/building.json` (with the measured floor height)
- The original measurement records (photos and scans of the sheets), in `data/measurements/`
- `data/README.md`: data sources, errors, known problems

**Acceptance criteria:**
- V1 to V10 all pass.
- Spot-check 5 distances; the suggested limit for the difference from a fresh measurement on site is 0.3 m.
- Every room on the floor can be reached from the entrance.

**Schedule:**
- Nov 13 to Nov 26 (weeks 1 to 2): the complete set of three files for **one floor**, passing validation before the Nov 26 (Thursday) report.
- After that: the other floors. They will go faster than the first one, because the stairs and elevators are in fixed positions.

**When you are stuck:**
- Cannot get the official floor plans → rely on measurements. This is a known fallback.
- Cannot measure something (a locked room) → estimate it from the symmetry of the neighboring rooms, and mark it as an estimate in the README.

### 5.3 Route Algorithm Team (1 person)

**Goal:** Implement `findRoute`, which computes the shortest route on the graph (A*).

**What the integrators provide before you start:**
- The specs in 4.2 and 4.5
- A sample `graph.json` (fake data, about 10 to 20 nodes)
- An empty test file template

**How to do it:**
1. Read `graph.json` and build an adjacency list.
2. Implement A*, using the **straight-line distance in the plane** as the heuristic (floors are not counted, so it never overestimates).
3. Support `mode`: `stair` excludes elevator edges, and `elev` excludes stair edges.
4. Map room codes to room nodes.
5. Write tests: 10 fixed start and destination pairs, compared against **hand-computed shortest routes** (this is the verification method written in your report).
6. Format the output as specified in 4.5.
7. Provide `findRoute.stub.js` (a stub function that always returns a fixed route) for the UI Team to use first. **Provide it on the first day.**

**Deliverables:**
- `src/route/findRoute.js`
- `src/route/findRoute.test.js`
- `src/route/findRoute.stub.js`
- `src/route/README.md`

**Acceptance criteria:**
- All 10 tests pass (both the route and the distance are correct).
- When no route is found, the room code does not exist, or the start equals the destination, there is a clear return value and no exception is thrown.
- It does not depend on browser APIs, so the tests can run in Node.
- On the real graph, a single query should take no more than 100 ms (suggested; on a phone it has to feel instant).

**Schedule:**
- Within two days of Nov 13: hand in the stub.
- By Nov 26: the core A* and its tests pass.
- By Dec 3: run the 10 verification pairs on the real graph.
- As soon as the real data arrives: run the 10 verification pairs on the real graph.

**When you are stuck:** If the Map Data Team has not handed in the real data yet → use the sample fake data first. The format is the same, so you can swap it in directly later.

### 5.4 UI Team (2 people)

**Goal:** Build the web pages that users actually use. 2D first, with mobile (iPhone Safari) as the priority.

**What the integrators provide before you start:**
- The specifications in 4.1 to 4.7
- Sample SVG, `rooms.csv`, and `graph.json`
- `findRoute.stub.js`, `viewer3d.stub.js`, and `position.stub.js` (stub functions)

**How to do it:**
1. **Screens (minimum version):**
   - Start and destination selection (dropdown plus search; the data comes from `rooms.csv`).
   - 2D map: show the SVG of the current floor, with 1F / 2F / 3F switching.
   - Route display: draw the `path` returned by `findRoute` as a line. **When the route crosses floors, automatically switch to the matching floor and show a prompt**, such as "Take the elevator/stairs to 3F here."
   - Distance and a text description (for example, "About 55 meters, take the elevator from 1F to 3F").
   - Tapping the map resets the current position.
2. **Cross-floor options:** Shortest / Stairs only / Elevator only (accessible).
3. **2D/3D toggle:** 2D by default. Create `createViewer3D` only when switching to 3D, and call `dispose()` when switching back. If 3D fails, fall back to 2D automatically.
4. **Position prompts (phase 2):** Use the `confidence` field from `position`. When the state is `lost`, or the user has moved too far since the last confirmation, ask the user to confirm their position.
5. Use the **stub functions** to get the whole flow working first, then replace them when the real modules are ready. The interfaces do not change.

**Deliverables:**
- The web code under `src/ui/`
- `src/ui/README.md` (how to start it and how to swap the data)
- A short usage guide or screenshots

**Acceptance criteria:**
- Everything works on iPhone Safari: choosing the start and destination, viewing the route, and switching floors.
- The floor-switching prompt is correct when a route crosses floors.
- The only data source is the standard files under `data/`; swapping the data needs no code changes.
- When no route is found, a clear message is shown, not a blank screen.
- No horizontal scrolling at phone width (about 375 px).

**Schedule:**
- By Nov 19: get the 2D layout working with the sample data and stub functions.
- By Nov 26: connect the real `findRoute`, and swap in the real SVG once the map data arrives.
- By Dec 3: MVP integration (one floor of real data, usable on iPhone Safari).
- 3D and position prompts come in the second phase.

**When you are stuck:** For anything that upstream teams have not delivered yet, use sample data and stub functions. Don't wait.

### 5.5 3D Team (1 person)

**Goal:** Build a 3D viewer component that can be embedded in the UI and is generated from the same SVG.

**What the integrators provide before you start:**
- The specs in 4.1 and 4.6
- `src/viewer3d/createViewer3D.js`: **a first version is already done**. It reads the standard SVG in 4.1 and implements every function in 4.6
- `examples/viewer3d-demo.html`: a demo page (uses the real `findRoute`, can switch between 2D and 3D, and can rebuild 10 times to test `dispose`)
- Sample SVG (`data/svg/`)

**How to do it:**
1. Start from the first version and run it with the sample data first (`npm run serve`, then open `http://127.0.0.1:8080/examples/viewer3d-demo.html`).
2. After switching to the real SVG from the Map Data Team, check:
   - Outline `<polygon class="outline">` → floor slab.
   - Room `<polygon class="room">` → room walls (it currently assumes rooms on both sides of a corridor; irregular shapes need to be tested with real data).
   - Door `<line class="door">` → an opening in the wall.
   - Stairs and elevators → currently simple steps and boxes; the stair direction is fixed along x, so adjust it if the real stairs differ.
3. Strengthen: the floor height follows `building.json` (the first version already reads it); test the behavior of non-rectangular stairs and basement floors.
4. Performance: low polygon count, no textures; walls use shared materials and shared geometry (the first version already does this); it has to be tested on a real iPhone.
5. Hand-off with the UI Team: `viewer3d.stub.js` is already provided with the same interface, so the UI Team can use it first.

**Deliverables:**
- `src/viewer3d/createViewer3D.js`
- `src/viewer3d/viewer3d.stub.js`
- `src/viewer3d/README.md`

**Acceptance criteria:**
- Every function in 4.6 works.
- Room labels match the 2D map, and the route line is at the same position as in 2D.
- It rotates smoothly on iPhone Safari.
- Memory does not keep growing after `dispose()` (switching between 2D and 3D ten times is still smooth).
- When the data cannot be read or WebGL is unavailable, it throws a recognizable error so that the UI can fall back to 2D.

**Schedule:**
- Within two days of Nov 13: the stub.
- By Nov 26: build the component with the sample data.
- From Dec 3: swap in the real data and connect the UI's 2D/3D toggle.
- After the map data is delivered: swap in the real data and adjust the look of the stairs and elevators.

### 5.6 Sensors and Positioning Team (2 people)

**Goal:** Verify how far indoor tracking can go on an iPhone web page, and produce a usable positioning prototype. There are two roles:

- **Role S1 (data and evaluation):** collect sensor data, analyze it, and write the evaluation report.
- **Role S2 (positioning prototype):** implement PDR (pedestrian dead reckoning) plus map matching, and verify it by replaying S1's data.

**What the integrators provide before you start:**
- The specs in 4.7 and 4.8
- `position.stub.js` (a stub module)
- Empty templates for the phone inventory, `runs.csv`, and `marks.csv`
- Once the Map Data Team hands in one floor: the node file, as the source of checkpoint ids

**Core idea (read this first):**
Without hardware, and with iOS unable to read Wi-Fi or the barometer, the system **cannot** automatically know which classroom the user is in the moment the app opens. The approach is:
1. The start comes from the user's choice, or from detecting arrival at the entrance with GPS outside the building.
2. After that, count steps with the accelerometer and determine direction with the gyroscope and compass, moving along the corridors of the graph (map matching: people only walk along corridors).
3. At a turn, snap to the corner node; when climbing stairs, snap to the stair node and switch floors; when reaching a room door, let the user confirm with a button.
4. The user can tap the map to reset at any time.
5. Floors: detect the gait of climbing stairs, and ask the user to confirm the floor when leaving the stairwell.

**S1: how to collect data**

| ID | Experiment | Key points |
|---|---|---|
| E1 | Sensor availability | For each phone: which sensors can the app and the web page each read? Record a phone capability table |
| E2 | Step count and step length | Walk a straight corridor that has been measured (for example 20 m), and record the true step count and distance; suggested 5 runs per person per phone |
| E3 | Heading drift | Walk a straight line and a rectangular loop back to the start, and record the position error on returning to the origin; mark the sections near elevators and steel columns |
| E4 | Floor detection | (a) Usable on the web: the accuracy of detecting the gait of climbing stairs; (b) for data comparison only: record air pressure with an app to evaluate how much more accurate a native app would be |
| E5 | Fixed-route evaluation | Pick 3 to 5 routes per floor and walk each 3 times, marking the checkpoints, then compute the position error offline (needs the nodes from the Map Data Team) |
| E6 | Web page background behavior | Whether the sensors stop after the screen turns off or the page goes to the background, and the battery use |
| E7 | Landmark detection | False alarms and misses in turn detection and stair detection |
| E8 | Effect of map matching | Compare the position error of the same data with and without snapping to corners and edges |
| E9 (optional) | Android Wi-Fi signal | About 4 scans every 2 minutes in the foreground, so each point needs at least 2 minutes; do only a small trial at 1 or 2 points; not part of the first version |

Data marking: use existing landmarks as checkpoints as much as possible (door numbers, stair entrances), and do not stick things on the corridor yourselves. Register one row in `runs.csv` for every recording, and write the marks into `marks.csv`.

**S2: how to build the positioning prototype**
1. Step detection: apply a low-pass filter and peak detection to the acceleration magnitude.
2. Step length: use the result of E2; start with a fixed step length.
3. Direction: mainly the gyroscope, corrected by the compass (the heading value obtained by an iOS web page).
4. Map matching: represent the position as "how many meters along a particular edge of the graph," and let the direction decide which edge to take.
5. Corrections: snap to the corner at turns, snap to the stairs and update the floor when climbing stairs, and reset to zero when the user confirms.
6. Implement it as the `createPositioning` in 4.7, as pure logic that does not depend on the browser, and verify it by replaying S1's CSV files in Node.

**Deliverables:**

| Deliverable | Contents | Owner |
|---|---|---|
| Phone capability table | Results of E1 | S1 |
| Collection procedure document (1 page) | How to walk, how to mark, file naming rules | S1 |
| Dataset | The `sensor-data/` folder, including `runs.csv` and `marks.csv` | S1 |
| Analysis scripts | Read the CSV files and compute the metrics | S1 |
| Evaluation report | Step count error, average step length, heading drift, floor detection accuracy, position error at each checkpoint, and a comparison with and without map matching, with charts | S1 |
| Parameter file | Step length and thresholds, for S2 to use | S1 → S2 |
| Positioning module | `src/position/createPositioning.js` plus a replay tool and tests | S2 |
| Platform recommendation | Based on E1 and E6: whether a web version is feasible for the first version, and whether a native app is needed | S1 |

**Acceptance criteria:**
- All CSV files follow the format in 4.8, and the raw files have not been modified.
- Every evaluation metric has a sample size and a calculation method, with the location of the raw data attached, so that it can be reproduced.
- The positioning module can replay a piece of real data in Node and output a sequence of positions.
- **Do not set target values yet**; decide them together with the integrators after seeing the actual data from the trial collection.

**Schedule:**
- Nov 13 to Nov 19 (week 1): E1, E2, and the collection procedure document. These do not depend on the Map Data Team.
- **Data collection ends before Dec 10**; after that, only analyze, write the report, and fix the positioning module, so that the evaluation can be finished before Dec 18.
- After that: E3, E4, and E6, and once the Map Data Team's nodes are in place, E5, E7, and E8. S2 builds the prototype in parallel.
- Last: E9 (only if there is time).

**Important reminder:** The minimum version does **not depend** on this team, and this team's progress must not hold up the main line.

---

## 6. The Integrators' Kickoff Kit Checklist

What the integrators have to prepare before the teams start. The status column is the current state; "kickoff kit" means `kickoff-kit/`.

| Item | For whom | Status |
|---|---|---|
| This specification | All | Done (v0.2, awaiting confirmation) |
| Repository skeleton (the folders in 3.3) | All | The kickoff kit has the directory structure; the GitHub repository is yet to be created |
| Sample `floor-N.svg`, `rooms.csv`, `building.json` | Map, UI, 3D, Route | Done (kickoff kit, sample data) |
| Sample `graph.json` | Route, UI | Done (kickoff kit, generated by `tools/gen-sample-data.js`) |
| `findRoute.js` (A* first version) and tests | Route, UI | Done (18 tests pass; the expected values were computed by hand from the sample data) |
| `findRoute.stub.js` | UI | Done |
| `viewer3d.stub.js` | UI | Done |
| `position.stub.js` | UI, 3D | Done |
| `tools/validate-data.js` (V1 to V10) | Map team, Integration team | Done (tested with deliberately broken data) |
| On-site measurement sheet | Map team | Done (`docs/templates/`) |
| Templates for the phone inventory, `runs.csv`, and `marks.csv` | Sensors team | Done |
| `createViewer3D.js` and `viewer3d-demo.html` | 3D team, UI | Done (first version, reads the standard SVG, tested in a desktop browser; not yet tested on an iPhone) |
| A small tool that turns an SVG into a draft of the nodes | Map team | To be produced (corridor nodes still have to be added by hand) |
| A letter to the department office requesting the floor plans | Integrator | To do |
| GitHub repository, member invitations, chat group | All | To be created |
| The demo script for the Dec 18 final presentation (what to show, which start and destination pairs to use) | All | To be written (to be finalized before the Dec 10 feature freeze) |

---

## 7. Schedule

**Fixed dates:**
- **Nov 13 (Fri):** The first meeting between the integrators and the new members.
- **Every Thursday:** Progress report.
- **Every Friday:** Class, and discussion with the instructors.
- **Dec 18 (Fri): final presentation.**

From Nov 13 to Dec 18 is exactly 5 weeks. The milestones and team plans below are suggestions and can be adjusted after meetings; any adjustment has to be written into the change log.

### 7.1 Weekly rhythm

| When | What happens |
|---|---|
| Friday | Class: take the Thursday report summary to discuss with the instructors and get feedback. After class the integrator updates `docs/decisions.md` and confirms each team's tasks for the next week |
| Saturday to Tuesday | Each team works |
| Wednesday evening | Each team updates its own README and progress summary and submits its PRs (suggested deadline) |
| Thursday | Progress report (45 to 60 minutes). Afterward the integrator writes a one-page summary for use in Friday's class |

**Report format:**
- About 5 minutes per team, saying three things: what was finished, where it is stuck, and what will be done next week.
- Bring something to show: a runnable link, screenshots, or passing test results.
- In the last 10 minutes the integrator announces cross-team decisions and the questions to ask the instructors on Friday.

### 7.2 Milestones

| Date | Milestone | Acceptance |
|---|---|---|
| Nov 12 (Thu) | The integrator has the kickoff kit ready; evacuation plans photographed and the floor plan request submitted | Repository, spec v0.2, sample data, and stubs are all in place |
| **Nov 13 (Fri)** | **First meeting**: explain the project, form the teams, hand out the kickoff kit, agree on the weekly rhythm | Everyone knows which team they are on and what to hand in during the first week |
| Nov 19 (Thu) | Report 1: kickoff preparation done | Every team's stub is handed in; the phone capability table (E1) is done; measuring one floor has started; the UI layout skeleton works with the sample data |
| Nov 26 (Thu) | Report 2: core components done | One floor's data passes V1 to V10; the A* tests pass; the UI runs the whole flow with fake data; a 3D component prototype; E2 is done |
| **Dec 3 (Thu)** | **Report 3: MVP integration** | One floor of real data plus the real `findRoute` plus the UI, so that on iPhone Safari you can look up where any classroom is and how to get there |
| **Dec 10 (Thu)** | **Report 4: feature freeze** | Multi-floor data; 2D/3D switching; the positioning prototype can replay real data; sensor data collection is finished; the demo script is final. **After this, only fix bugs and write documents; no new features** |
| Dec 17 (Thu) | Report 5: dress rehearsal | The whole demo flow runs once on an iPhone; the evaluation report, slides, and every team's README are done |
| **Dec 18 (Fri)** | **Final presentation** | — |

### 7.3 Each team's weekly plan (suggested)

| Week | Integration | Map | Route | UI | 3D | Sensors and Positioning |
|---|---|---|---|---|---|---|
| Week 1<br>Nov 13–19 | Hand out the spec and kickoff kit; create the repository; write the validation script | Photograph evacuation plans, request floor plans, measure one floor on site | Hand in the stub; start A* | Build the layout with the sample data | Hand in the stub; read the standard SVG | E1 phone capability table; E2 step count and step length; collection procedure document |
| Week 2<br>–Nov 26 | Validation script goes live; review PRs | Draw the SVG and build the graph; one floor passes validation | A* tests pass | Map display, floor switching, start and destination selection | Component prototype | E3 heading drift; S2 starts the PDR prototype |
| Week 3<br>–Dec 3 | **MVP integration**; integration testing | Hand in real data; start the second floor | Run the 10 verification pairs on the real graph | Swap in real data; cross-floor route prompts | Swap in real data; connect the 2D/3D toggle | E4 (floors), E6 (background behavior); start E5 once the Map team's nodes are in place |
| Week 4<br>–Dec 10 | **Feature freeze**; fix the demo script | Data for the remaining floors | Fixes; support all modes | Integrate position prompts; test on phones | Performance tuning | E5, E7, E8; **data collection ends**; replay-verify the positioning module |
| Week 5<br>Dec 11–17 | Dress rehearsal, slides | Data fixes | Fixes | Fixes; test on iPhones | Fixes | Analysis, evaluation report, parameter file |

### 7.4 When behind schedule: the order for cutting scope

Five weeks is short, and Dec 18 cannot move. When behind, **give up things starting from the last item**, and announce it at the Thursday report:

1. Protect first: **2D navigation for one floor (or two)**, that is, the MVP.
2. Next: multiple floors and cross-floor routes.
3. Next: the sensor evaluation report (a claim backed by data).
4. Next: the 3D view.
5. Give up first: **integrating real-time positioning into the web page** (instead, demonstrate the positioning prototype by "replaying recorded data").

This order is a suggestion. Please have the integrators and the instructors confirm it, because it decides what you will demonstrate at the final presentation.

---

## 8. Risks and Responses

| Risk | Response |
|---|---|
| The official floor plans cannot be obtained | Rely on measurements, with the evacuation plan as a background reference; state the accuracy in the data README |
| The map data arrives late and downstream teams sit idle | Downstream teams always use the sample data and stubs; with the same format, they can swap directly |
| The spec is changed midway and teams do wasted work | Only the integrators change the spec, and every change is written into the change log and announced to all teams |
| With many people, everyone edits the same file | Use the PR workflow; each team only changes its own folder; merging is reviewed by the integrators |
| Sensors cannot be read by an iOS web page, or stop in the background | Verify E1 and E6 first; use the results to decide what is feasible for the first version |
| 3D is too slow on phones | 2D is the default and 3D is optional, with automatic fallback |
| The scope keeps growing | Freeze the MVP; new ideas go onto the backlog and are discussed after the MVP is done |
| Only 5 weeks, and progress falls behind | Follow the "order for cutting scope" in 7.4, giving up from the last item, without delaying Dec 18 |
| The first meeting is only on Nov 13, so the early period is idle | The integrator has the kickoff kit ready by Nov 12; form the teams and hand out tasks on the day of the meeting |
| The integrators become a bottleneck | Each team's lead decides the details inside the team; the integrators only handle cross-team specs and merging |

---

## 9. Change Log

| Version | Date | Change | Affects |
|---|---|---|---|
| v0.1 | (fill in the date) | First version | — |
| v0.2 | (fill in the date) | The schedule changed to the Dec 18 final presentation, 5 weeks in total; Thursday progress reports and Friday class discussions; added the order for cutting scope | Chapters 3.6, 5, 7, 8 |
| v0.2.1 | (fill in the date) | Kickoff kit completed; the 3D component first version changed to read the standard SVG; updated the status in chapters 4.1, 5.5, and 6 | 3D Team, UI Team, Integration Team |
| v0.2.2 | (fill in the date) | The building changed from the Mathematics Building to Engineering Building #5 (all the members are Computer Science students); the building code in the sample data changed to `eng5` | All |
| v0.2.3 | (fill in the date) | The branch name changed from `main` to `master` (3.4, 3.5, 5.1); added the full English translation `docs/spec.en.md` | All |

---

## Appendix A: A 5-Minute Guide for New Members

1. What the project is about: chapter 1.
2. Which team you are on and what your deliverables are: chapter 2 and the matching part of chapter 5.
3. Whom you depend on and who depends on you: the dependency diagram in chapter 2.
4. What you get when you start: chapter 6.
5. How your work counts as done: section 3.5 and your team's acceptance criteria.

## Appendix B: Templates

### B-1 On-site measurement sheet (one per floor)

| Field | Fill in |
|---|---|
| Floor | |
| Date, people | |
| Description of the base point (the start of the corridor) | |
| Measuring tools | |
| Floor height (floor to ceiling, and the slab thickness) | |
| Corridor width (measured at several places) | |

| Side (north/south) | Room code | Cumulative distance to the left edge of the door (m) | Cumulative distance to the right edge of the door (m) | Room depth (m) | Room width (m) | Second measurement consistent? (difference ≤ 0.1 m) | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

| Closure check | Value |
|---|---|
| Corridor width | |
| Depth of the rooms on one side | |
| Depth of the rooms on the other side | |
| Wall thickness (estimate) | |
| Total | |
| Total width of the building (from satellite imagery or measured) | |
| Difference (suggested ≤ 0.3 m) | |

| Stairs and elevators | id | Position (x, z) | Size | Which side the entrance is on |
|---|---|---|---|---|
| | | | | |

### B-2 Phone inventory

| Phone model | OS version | Has a barometer? | Can the web page read the accelerometer and gyroscope? | Can the web page read the compass? | Notes |
|---|---|---|---|---|---|
| | | | | | |

### B-3 Templates for `runs.csv` and `marks.csv`

```csv
run_id,date,person,phone,placement,experiment,route,true_steps,true_distance_m,notes
```

```csv
run_id,t_ms,event,ref
```
