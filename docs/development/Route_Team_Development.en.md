# Route Team Development Specification — V0.1

> Status: draft implementation specification. Graph, Route, and Destination fields follow the unified data specification.  
> This is an English translation of the Chinese original (`docs/development/Route_Team_Development.md`). If the two differ, the Chinese original prevails.

## 1. Purpose and Version
Defines the implementation requirements for computing a feasible route from the current position to a destination, and fixes the cross-team `findRoute()` contract.

## 2. Team Mission and Scope
Responsible for Graph path search, constraints, route cost, no-path handling, and step data. Map topology is provided by the Map Team; position by the Localization Team; route presentation is handled by the 3D / UI Teams.

## 3. Use Cases and System Flow
Obtain the localization result and destination → verify floor / node / graph version → map start and end onto the Graph → apply movement mode and constraints → search for a path → produce Route and summary → presented by the UI / rendering teams.

## 4. Input Data and Preconditions
Required: Graph, a valid Localization Result, a Location ID, and a movement mode `any | stair | elev`. The Graph, localization, and destination must use the same `building_id`, `map_version`, and `coordinate_system_id`; a cross-floor destination must have a reachable floor-connecting edge.

## 5. Output Data and Quality Requirements
On success returns a Route: `path`, equivalent cost `length`, ordered `floors`, and `transitions`. When no path is reachable, returns `null`; invalid input or execution failure is handled by the project-wide exception handling specification.

## 6. Cross-team Interfaces and Data Dependencies
`findRoute()` is a cross-team function. The destination is passed in as the Location `id`; the result is output in the unified Graph / Route structure. The rendering side matches the Route `path` nodes and Graph edges to the map.

## 7. Design and Implementation Rules
- Search only uses valid Graph edges that satisfy the traversal conditions; floors and accessibility conditions are part of the feasibility judgment. The V1 Graph is undirected: all edges can be traversed in both directions, and directionality and temporary closures are not handled.
- By default the cost may use distance; other preferences (fewer turns, avoiding stairs) must be offered explicitly as options, with the algorithm / cost semantics recorded.
- When the start is a coordinate, it must be mapped to a valid node through the map and the mapping method kept; when it is far from any walkable area, return an invalid-start result.
- Every pair of adjacent Route nodes corresponds to a Graph edge, and the total route length can be recomputed and verified.

## 8. Error Handling and Special Cases
Non-existent start / end, graph version mismatch, disconnected floors, movement restrictions that make the path infeasible, and empty or corrupted graphs all return an identifiable status. If the start's localization confidence is insufficient, return a result requiring re-localization / confirmation, or leave the decision to the caller; a distant node must not be silently chosen.

## 9. Testing and Acceptance
Verify distance and node sequence against known shortest paths; test same-floor, cross-floor, alternative paths, accessibility mode, no-solution, and wrong-version data. Verify that every Route edge exists and the total cost is consistent; performance thresholds are set separately based on the target device and Graph size.

## 10. Deliverables, Dependencies, and Open Items
Deliver `findRoute()`, option and cost documentation, error states, test cases, and a performance summary. Open: the formal mapping from destination to Graph node, route preference weights, and the step text format.
