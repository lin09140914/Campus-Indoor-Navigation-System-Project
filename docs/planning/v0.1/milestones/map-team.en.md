# Map Team V0.1 Development Schedule

## 1. Proposed Development Schedule

| Due date (2026) | Deliverable | Minimum requirement |
| --- | --- | --- |
| Nov 24 | Single-floor map data | Deliver an SVG, Graph, and node mapping for the same floor so the Route, 3D, and UI teams can begin integration. |
| Dec 1 | Whole-building data and initial validation | Complete the target building's floor data and stair/elevator connections; check coordinates and node mappings. |
| Dec 11 | Final V0.1 deliverable | Correct map data issues and deliver data in the shared format, map error evaluation results, and test records. |

## 2. Acceptance Criteria by Stage

| Stage | Acceptance criteria |
| --- | --- |
| Nov 24 | The single-floor SVG is readable; Graph nodes and edges match accessible space; locations map to navigation nodes; all three data sets use consistent floor and coordinate rules. |
| Dec 1 | Required floors have map data; stair and elevator connections are correct; the SVG, Graph, and node mapping agree; initial on-site comparisons are complete. |
| Dec 11 | Other teams can use the final map data; `evaluateMapError()` reports position or distance errors, statistics, and conclusions from actual measurements. Error thresholds and the required number of test points remain to be defined. |

## 3. Features to Implement

- Create an SVG floor plan for each floor in the shared data format.
- Build a Graph with accessible nodes, edges, weights, and stair/elevator connections.
- Map locations to Graph nodes and keep the SVG, Graph, floors, and coordinates consistent.
- Implement the offline `evaluateMapError()` test function and retain measured error results.
