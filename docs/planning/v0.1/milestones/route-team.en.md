# Route Team V0.1 Development Schedule

## 1. Proposed Development Schedule

| Due date (2026) | Deliverable | Minimum requirement |
| --- | --- | --- |
| Nov 29 | Single-floor A* routing | Use the Map team's single-floor Graph to provide a callable same-floor search and an initial Route output. |
| Dec 4 | Node matching and cross-floor routing | Integrate localization results, destinations, and travel modes; complete accessible-node matching, cross-floor search, and Route validation for the UI and 3D teams. |
| Dec 11 | Final V0.1 deliverable | Complete integration, error handling, route correctness tests, and test records. |

## 2. Acceptance Criteria by Stage

| Stage | Acceptance criteria |
| --- | --- |
| Nov 29 | Same-floor start and destination points yield a continuous, legal path; other teams can read the Route's ordered nodes, coordinates, and floor. |
| Dec 4 | The start position and destination resolve to valid nodes; stair/elevator transitions obey the selected travel mode; an unreachable destination returns `null` without inventing a route. |
| Dec 11 | Validate route weights and shortest paths against known answers or independent calculations. At least 10 cases are recommended, covering same-floor and cross-floor routes, different modes, and invalid input; retain expected and actual results. |

## 3. Features to Implement

- Implement the shared `findRoute(graph, start, destination_id, mode)` interface using A* and return a Route in the shared format.
- Match localization results and destinations to accessible Graph nodes.
- Restrict edges by `any`, `stair`, or `elev` mode, with same-floor and cross-floor routing.
- Handle invalid destinations, mismatched versions or coordinate systems, and unreachable routes; provide test records.
