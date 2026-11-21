# 3D Team V0.1 Development Schedule

## 1. Proposed Development Schedule

| Due date (2026) | Deliverable | Minimum requirement |
| --- | --- | --- |
| Nov 29 | Single-floor 3D map | Use the Map team's SVG for an initial `renderMap()` that displays one floor in Android WebView and supports view rotation. |
| Dec 4 | Route display and multiple floors | Complete `renderRoute()` to overlay a route and support the map and route for a floor selected by the UI. |
| Dec 11 | Final V0.1 deliverable | Complete UI integration, rendering error handling, and map/route correctness tests. |

## 2. Acceptance Criteria by Stage

| Stage | Acceptance criteria |
| --- | --- |
| Nov 29 | The single-floor scene matches the source SVG's spatial structure, supports 360-degree rotation, and produces a `renderMap()` result the UI can display. |
| Dec 4 | Users can switch the displayed floor; same-floor and cross-floor Routes appear on the correct floor and coordinates; updating a route leaves the map intact. |
| Dec 11 | Test with actual SVG, Graph, and Route data; record expected and actual views, offsets, and failures; report errors for invalid or mismatched data. |

## 3. Features to Implement

- Implement `renderMap()` with Three.js to create rotatable single-floor and multi-floor scenes from shared SVG and floor data.
- Implement `renderRoute()` to overlay a Route in the correct position and clear an earlier route.
- Let the UI select the displayed floor while keeping the map, route, and shared coordinates aligned.
- Provide rendering interfaces and error states that Android WebView can use.
