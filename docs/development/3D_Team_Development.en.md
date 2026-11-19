# 3D / Rendering Team Development Specification — V0.1

> Status: draft implementation specification. This document covers map and route visualization; the data contract follows `Data_Specification.md`.  
> This is an English translation of the Chinese original (`docs/development/3D_Team_Development.md`). If the two differ, the Chinese original prevails.

## 1. Purpose and Version
Defines the requirements for turning standard map and route data into readable, interactive 2D / 3D scenes, and agrees on `renderMap()` and `renderRoute()`.

## 2. Team Mission and Scope
Responsible for loading SVG / floor scenes, viewpoints and floor presentation, route overlay, interaction state, and performance. Map data is provided by the Map Team and Route by the Route Team; destination selection and localization state are integrated in collaboration with the UI.

## 3. Use Cases and System Flow
Load Floor and SVG → build the scene → show the current floor and localization → obtain the Route → convert Route nodes / edges to scene geometry → highlight the route and start / end points → update as floors switch.

## 4. Input Data and Preconditions
`renderMap()` accepts SVG, Floor, and display settings; `renderRoute()` accepts Route, Graph, and an already loaded scene. The data's `building_id`, `map_version`, and `coordinate_system_id` must be consistent; the container / rendering engine must be available and have a valid size.

## 5. Output Data and Quality Requirements
The functions produce a scene / render control result usable by the UI, including success status and errors; internal engine objects must not be written into the shared data contract. The route must align with the map geometry, and no wrong-floor segments are shown when floors switch.

## 6. Cross-team Interfaces and Data Dependencies
`renderMap()` and `renderRoute()` are shared APIs. They depend on the SVG, Floor, Route, and Graph field contracts. If localization results are presented, the UI / scene integration calls for them; the interface does not infer navigation paths itself.

## 7. Design and Implementation Rules
- Use the Floor `svg_transform` to convert SVG coordinates to building XZ coordinates, and `elevation_m` as the Y height; scaling / rotation must be applied consistently to the map, position markers, and route.
- SVG must be parsed safely; limit external resources and unnecessary scripts. Missing visual elements must not change the route topology.
- The Route is drawn by mapping nodes / edges to geometry, with direction arrows and floor connections clearly distinguishable; provide current-floor filtering.
- Support container resizing, reloading, and resource cleanup; the presentation result must be controllable / updatable by the caller.

## 8. Error Handling and Special Cases
Invalid SVG, missing IDs, map version mismatch, a Route pointing to a non-existent node, an empty container, or insufficient WebGL / 3D capability must be reported as handleable errors, falling back to 2D when necessary. Errors must not be turned into a blank view with no status returned.

## 9. Testing and Acceptance
Check different floors, coordinate conversion, scaling, rotation, route alignment, start / end points, cross-floor switching, missing shapes, and 2D fallback. Verify clarity, interaction, and resource release across container sizes and target devices; performance thresholds are set separately from real-device measurements.

## 10. Deliverables, Dependencies, and Open Items
Deliver the two shared functions, scene update / cleanup methods, error reporting, a sample page, and device verification records. Open: accessibility presentation, floor height, and cross-floor animation rules (the 3D engine is fixed as Three.js; see `Technology_Stack.md`).
