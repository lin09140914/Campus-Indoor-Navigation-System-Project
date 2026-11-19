# Localization Team Development Specification — V0.1

> Status: draft implementation specification. Data fields follow `Data_Specification.md`.  
> This is an English translation of the Chinese original (`docs/development/Localization_Team_Development.md`). If the two differ, the Chinese original prevails.

## 1. Purpose and Version
Defines the team's work of estimating indoor position using device sensors and map reference data. V0.1 first establishes a stable input/output contract; the localization method is replaceable.

## 2. Team Mission and Scope
Responsible for sensor data fusion, map matching, position confidence, and localization status. Provides `getCurrentPosition()`. Map geometry is provided by the Map Team, route planning is the Route Team's responsibility, and screen presentation is the UI / 3D Teams' responsibility.

## 3. Use Cases and System Flow
Obtain device permissions and available sensors → load the current floor map / Node Mapping → collect sensor data → estimate position and floor → map constraints / quality check → return the Localization Result → UI displays it or uses it for route planning.

## 4. Input Data and Preconditions
- Sensor observations (for example step count, heading, Wi-Fi / BLE, or other approved sources), with timestamps and units.
- Map version, Floor, Node Mapping; optionally the last position and localization settings.
- The user has granted the required permissions and the device sensors are available. The system must degrade gracefully when a sensor source is missing.

## 5. Output Data and Quality Requirements
Outputs a Localization Result with `building_id`, `map_version`, `coordinate_system_id`, `position: {x,z,floor}`, `confidence`, and a UTC `timestamp`. Confidence is a normalized score in the range 0–1 and does not represent a probability of success; on localization failure, coordinates or confidence must not be fabricated.

## 6. Cross-team Interfaces and Data Dependencies
`getCurrentPosition()` is a cross-team interface. Its result can serve as the start point for `findRoute()` and can be displayed by `renderMap()` / `renderRoute()`. Callers must not assume every call produces a fresh position; they judge freshness from the result's time and status.

## 7. Design and Implementation Rules
- Positions use the building local coordinate system, in meters; localization output uses the XZ plane and an integer `floor`; height can be looked up from the Floor's `elevation_m`.
- Return the localization time and data validity; asynchronous or streaming implementations must follow the interface agreement.
- Position updates should be traceable to the map version and sensor source; personal / sensor data is handled under the principle of minimization.
- Map matching must not snap a position through a wall or onto a non-walkable area; output a low-confidence or no-solution status when necessary.

## 8. Error Handling and Special Cases
Permission denial, unavailable sensors, missing map, unknown floor, or execution failure must not result in a fabricated position. V1 only requires automatic in-place localization, not continuous position tracking; failure codes and reporting methods are defined by the project-wide exception handling specification.

## 9. Testing and Acceptance
Cover each floor, corridors / corners / entrances, stationary and moving, sensor noise, permission denial, missing sensor sources, map version mismatch, and floor switching. Compare position error, floor detection rate, update latency, and low-confidence recognition against annotated routes; thresholds must be determined by real device and site measurements.

## 10. Deliverables, Dependencies, and Open Items
Deliver `getCurrentPosition()`, data source descriptions, settings, error states, test records, and known limitations. Depends on the calibrated drawings provided by the Map Team. Open: list of supported sensors, platform permissions, update frequency, confidence calibration, and target error thresholds.
