# Map Team Development Specification — V0.1

> Status: draft implementation specification. Cross-team data follows `docs/interfaces/schemas/Data_Specification.md`; shared functions follow `docs/interfaces/functions/function.md`.  
> This is an English translation of the Chinese original (`docs/development/Map_Team_Development.md`). If the two differ, the Chinese original prevails.

## 1. Purpose and Version
Defines how the Map Team converts campus indoor floor plans into standard map data usable for localization, route planning, and visual presentation. Version V0.1; changes must record version, date, reason, and compatibility.

## 2. Team Mission and Scope
Responsible for source drawing cleanup, SVG normalization, unified coordinate calibration, modeling of walkable areas and obstacles, building the topology Graph, and offline map quality evaluation. UI, localization, and routing algorithms are outside this team, but it must provide the data they need.

## 3. Use Cases and System Flow
Per floor, import the source drawing → clean up layers and geometry → build the standard SVG → calibrate coordinates → annotate rooms, passages, entrances/exits, stairs, and elevators → build the Graph → verify topology and error → publish a versioned map package.

## 4. Input Data and Preconditions
- Original floor plans (SVG preferred; other formats are converted first and the source is kept).
- Floor identification, scale or known control points, inter-floor connecting facilities, and no-go area data.
- On-site surveyed control points matched to map features. Without a reliable scale or control points, meter-level accuracy must not be claimed.

## 5. Output Data and Quality Requirements
Output SVG, Floor, Graph, and Node Mapping according to the unified contract; every entity is linked by a stable ID. All walkable edges must connect valid nodes and must not cross obstacles; cross-floor edges must state the connecting facility and both floors. The map package must include the version, source, coordinate reference, calibration data, and a quality report.

## 6. Cross-team Interfaces and Data Dependencies
Downstream teams link data by `building_id`, `map_version`, `coordinate_system_id`, integer `floor`, and `id`, not by display text or array order. `renderMap()` uses SVG / Floor; `findRoute()` uses Graph; Node Mapping maps `node_id` to the SVG `svg_anchor_id`. Contract changes must be coordinated with the interface maintainer.

## 7. Design and Implementation Rules
- SVG uses `viewBox`, standard layer IDs, and `data-building-id` / `data-floor` / `data-map-version`. It is converted to building-local XZ coordinates using the Floor's `svg_transform` and the single formula; the world vertical height is `floor.elevation_m`.
- Geometry elements must have semantic labels or stable IDs; decorative shapes must not become part of the walkable network.
- Graph nodes use `id,x,z,floor,type`, and edges use `a,b,w,kind`; V1 is an undirected graph. `w` is an equivalent distance and must not be less than the XZ straight-line distance between the end nodes, to keep the A* heuristic valid.
- Obstacles, accessibility restrictions, and floor connectivity are expressed with explicit fields, not guessed from names. The V1 Graph is undirected and has no directionality field.
- `evaluateMapError()` is this team's offline internal function: it compares surveyed positions of control points with map-mapped positions and outputs sample count, mean / maximum error, and unit; it is not a cross-team API.

## 8. Error Handling and Special Cases
Missing scale, insufficient control points, damaged geometry, isolated nodes, duplicate IDs, invalid floor references, and disconnected regions must all be listed in the quality report. Data that could change topology must not be silently repaired; report it in an issue list and keep the original source. Each floor is calibrated independently; having the same origin is not assumed to mean the floors are connected.

## 9. Testing and Acceptance
- SVG is parseable and conforms to the coordinate, ID, and floor contracts.
- All Graph references are valid; edge lengths are non-negative and reasonable against the geometry; no-go areas cannot be crossed.
- Test per-floor islands, entrances/exits, stair / elevator connections, and accessibility restrictions.
- Run `evaluateMapError()` with control points and report the error distribution, measurement method, and samples; the acceptance threshold is set after on-site measurement, and no fictitious accuracy is assumed.
- The package can be read by the localization, routing, and rendering teams according to the contract.

## 10. Deliverables, Dependencies, and Open Items
Deliver versioned per-floor SVG, Floor / Graph / Node Mapping, source and calibration records, a quality report, and a change summary. Depends on on-site drawings and measurements. Open: final projection / origin, accuracy threshold, drawing licensing, who updates obstacles, and the scope of accessibility attributes.
