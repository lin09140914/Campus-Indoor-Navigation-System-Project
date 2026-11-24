# Cross-team Function Interface Specification — V0.1

> **Note:** This is an English translation of the Chinese original (`docs/interfaces/functions/function.md`). If the two differ, the Chinese original prevails.

This document lists only the interfaces called by other teams. Data types follow `docs/interfaces/schemas/Data_Specification.md`: the Graph fields are `building_id`, `map_version`, `coordinate_system_id`, `nodes`, `edges`; floors use the Integer `floor`; the Route movement mode is `any | stair | elev`. This document does not define each team's internal functions. `evaluateMapError()` is an offline internal test function of the Map Team; its specification is in `Map_Team_Development.md`.

## `getCurrentPosition`

### Name
`getCurrentPosition` (provided by the Localization Team).

### Purpose
Obtains the current device position estimate and returns the unified Localization Result.

### Input
- `options`: optional `{building_id?: string, map_version?: string, coordinate_system_id?: string}`. When all are omitted, the currently selected building, map, and coordinate system are used. V1 covers a single building, so all are normally omitted; the fields are retained for future multi-building extension, and the UI does not offer building selection.

### Output
- On success, returns the Localization Result from Section 6 of the specification: `building_id`, `map_version`, `coordinate_system_id`, `position: {x, z, floor}`, `confidence`, `timestamp`.
- On failure, coordinates or confidence must not be fabricated; the concrete error reporting method follows the project-wide exception handling specification.

### Preconditions
The device's location capability can be called, the required permissions are granted, and the selected building and map data are available. The caller must be able to handle asynchronous completion.

### Special cases
When permission is denied, sensors are unavailable, or map data cannot be used, failure is reported; success is never indicated with invented coordinates. V1 only requires automatic in-place localization, not continuous tracking.

## `findRoute`

### Name
`findRoute` (provided by the Route Team).

### Purpose
Computes a route that satisfies the movement-mode restrictions, based on the Graph, current localization, and destination.

### Input
- `graph`: a Graph conforming to the unified specification.
- `start`: a successful Localization Result.
- `destination_id: string`: the Location `id`.
- `mode: "any" | "stair" | "elev"`: movement mode.

### Output
- On success, returns an object conforming to the Route data specification: `building_id`, `map_version`, `coordinate_system_id`, `mode`, `path`, `length`, `floors`, `transitions`.
- When no path is reachable, returns `null`. Invalid input or execution failure is handled per the project-wide exception handling specification.

### Preconditions
The building, map version, and coordinate system of the Graph, localization, and destination data are compatible; the destination ID resolves to a valid Location and Graph Node; the start point can be mapped onto the Graph.

### Special cases
Invalid IDs, version / coordinate-system mismatch, no reachable path, or a mode that cannot be traversed must not produce a guessed route. When start equals end, a single node is allowed, `length` is 0, and `transitions` is empty.

## `renderMap`

### Name
`renderMap` (provided by the 3D Team).

### Purpose
Loads and presents the SVG of the given floor, and builds a scene on which localization and routes can be overlaid.

### Input
- `svg`: a floor file / content conforming to the SVG specification.
- `floor`: the floor object in `floors.json` that matches the SVG.
- `options`: optional `{view_mode?: "2d" | "3d", fit_to_view?: boolean}`; the container is specified by the implementation framework.

### Output
- `RenderResult`: `{status: "success" | "error", building_id: string, map_version: string, floor: number, scene?: unknown, error?: {code: string, message: string}}`. `scene` is a local rendering control object and is not serialized across teams.

### Preconditions
`data-building-id`, `data-floor`, and `data-map-version` of the SVG and Floor are consistent; the Floor's SVG path exists, the transform parameters are valid, the SVG can be parsed safely, and the render container is available.

### Special cases
When data does not match, the SVG is invalid, the container is invalid, or 3D capability is unavailable, an error is returned; where supported, it falls back to 2D and indicates the actual mode. Reloading must release the old scene's resources.

## `renderRoute`

### Name
`renderRoute` (provided by the 3D Team).

### Purpose
Presents the Route's `path` nodes and `transitions` on an already loaded map scene.

### Input
- `route`: a successful Route.
- `graph`: the Graph that produced this Route.
- `scene`: a scene successfully returned by `renderMap()` that is still valid.
- `options`: optional `{active_floor?: number}`.

### Output
- A `RenderResult` or an overlay control object, including success / error status; internal rendering objects are not part of the shared data contract.

### Preconditions
`building_id`, `map_version`, and `coordinate_system_id` of the Route, Graph, and scene are compatible; the Route's nodes / edges can all be verified in the Graph; the required floors are loaded.

### Special cases
When there is no reachable route (`null`), no route is drawn. Missing nodes, data version mismatch, or an invalid scene are reported as errors. Cross-floor connections must be presented as floor transitions, and XZ points on different floors must not be drawn as a direct horizontal passage; redrawing clears the old overlay.
