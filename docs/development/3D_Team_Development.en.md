# Campus Indoor Navigation System V1 — 3D Team Development Specification

**Document Version:** V0.1 (Draft)  
**Responsible Team:** 3D Visualization Team  
**Applicable Scope:** V1  
**Status:** Pending confirmation of cross-team data specifications

---

## 1. Development Objectives

The 3D Team is responsible for using Three.js to convert SVG floor plans provided by the Map Team into interactive map visualization scenes and overlay navigation routes provided by the Route Planning Team.

The core V1 tasks of this team are:

1. **Map rendering:** Support single-floor and multi-floor maps, allowing users to view maps with 360-degree rotation.
2. **Navigation route rendering:** Overlay routes in the map scene and correctly display their positions and floors.
3. **Rendering correctness testing:** Verify the consistency of the map and routes with the source data.

All map and route rendering must use the project-wide standardized data formats.

The 3D Team is not responsible for creating original SVG data, A\* algorithms, localization algorithms, or designing UI interaction flows.

## 2. Scope of Work and Deliverables

| Work Item | Deliverable | V1 Requirement |
| --- | --- | --- |
| Single-floor map rendering | Single-floor 3D map display | Required |
| Multi-floor map rendering | Multi-floor 3D map display | Required |
| 360-degree viewpoint rotation | Interactive map viewpoint | Required |
| Route overlay rendering | Navigation route displayed on the map | Required |
| Standardized SVG support | Ability to use standardized SVG data | Required |
| Standardized Route support | Ability to use standardized route data | Required |
| Rendering correctness testing | Test programs and test results | Required |

Maps and routes should be presented in the same scene, but their rendering functions must be usable separately.

## 3. Main Function Specifications

### 3.1 renderMap()

**Function:** Render a single-floor or multi-floor map using standardized SVG and related floor information.

### Input

| Input | Description |
| --- | --- |
| Standardized SVG | Floor plans for each floor provided by the Map Team |
| Floor data | Floor identifiers and related spatial information |
| Display settings | Display requirements such as single-floor, multi-floor, and viewing angle |

### Output

A map visualization result that can be displayed and operated by the UI Team.

Required functionality:

- Display single-floor maps.
- Display multi-floor maps.
- Provide 360-degree viewpoint rotation.
- Correctly represent map space and relationships between floors.

Actual parameters and output interfaces are pending confirmation of cross-team specifications.

### 3.2 renderRoute()

**Function:** Overlay a navigation route on an already established map scene.

### Input

| Input | Description |
| --- | --- |
| Standardized Route | Navigation route provided by the Route Planning Team |
| Loaded map scene | Visualization scene created by the map rendering function |

### Output

A visualization result with the navigation route overlaid.

Required functionality:

- Display the navigation route at the correct spatial position.
- Keep the navigation route coordinates consistent with the map.
- Support the display of same-floor and inter-floor routes.
- Do not disrupt the existing map display when updating the route.

The internal rendering methods for maps and routes may be independently determined by the 3D Team.

### Basic Processing Flow

1. Receive standardized SVG and floor data.
2. Create a single-floor or multi-floor map scene.
3. Provide map viewpoint rotation controls.
4. Receive a standardized Route.
5. Map Route coordinates and floors to the scene.
6. Overlay the navigation route on the map.
7. Provide the visualization result to the UI Team.

### Exceptional Conditions

The following conditions must be identifiable:

- SVG data is missing or invalid.
- Floor data does not exist.
- Map rendering fails.
- Route data is invalid.
- The route cannot be correctly mapped to the map.
- Route rendering fails.

The detailed error reporting format shall be standardized according to the project-wide exception handling specification.

## 4. Standardized Data Specifications

### 4.1 SVG Floor Plans

**Data Provider:** Map Team  
**Data User:** 3D Team

The 3D Team must use the project-wide standardized SVG format to ensure that building floor-plan structures on each floor can be correctly represented.

### 4.2 Standardized Coordinate System

SVG, Graph, Route, and the 3D scene must have consistent spatial correspondences.

The 3D Team must render according to the standardized coordinate definitions and must not independently change the meaning of the original spatial coordinates.

### 4.3 Route Format

**Data Provider:** Route Planning Team  
**Data User:** 3D Team

Route must correctly represent the positions, node order, and floor information traversed by the route so that it can be overlaid in the scene.

### 4.4 Floor Data

The standardized floor numbering and spatial correspondence rules must be followed to ensure consistent display of single-floor, multi-floor, and inter-floor routes.

### 4.5 Localization Results

If the 3D scene needs to show the user's location, it must use the standardized localization results and coordinate conventions provided by the Localization Team.

The independent interface and operation methods for specific position markers remain subject to confirmation of cross-team interfaces.

Formal fields, types, and data structures in this section shall follow the project's eight standardized data specifications.

## 5. Cross-Team Handoffs

| Related Team | Handoff Data or Function | Purpose |
| --- | --- | --- |
| Map Team | SVG, floor, and coordinate data | Build the 3D map |
| Route Planning Team | Standardized Route | Render the navigation route |
| Localization Team | Standardized localization result | Display the user's location when needed |
| UI Team | Calls to rendering functions | Display maps and routes |
| UI Team | Display and interaction requirements | Control visualization content |

The 3D Team is responsible for rendering functionality, while the UI Team is responsible for integration and providing user interaction interfaces.

## 6. Development Environment and Dependencies

The 3D Team is confirmed to use:

- **Primary rendering engine:** Three.js.
- **Rendering programming language:** JavaScript.
- **IDE:** Unrestricted choice.
- **Target platform:** The project's Android App.

Because Three.js uses WebGL, it must be compatible with the visualization hosting environment of the Android application.

Integration through Android WebView is currently planned, but the formal bridging method and related versions remain subject to confirmation of the system integration architecture.

Other development dependencies may be selected independently by the 3D Team, but must comply with project development guidelines.

## 7. Testing and Acceptance Requirements

### 7.1 Map Rendering Tests

| Test Item | Acceptance Criteria |
| --- | --- |
| Single-floor rendering | Correctly display a single-floor map |
| Multi-floor rendering | Correctly represent different floors |
| 360-degree rotation | Freely rotate the map viewpoint |
| SVG correctness | Map structure is consistent with the original SVG |
| Coordinate consistency | Map spatial positions correspond to the standardized coordinates |
| Floor consistency | Positions and relative relationships among different floors are correct |

### 7.2 Route Rendering Tests

| Test Item | Acceptance Criteria |
| --- | --- |
| Same-floor route | The route is displayed at the correct position |
| Inter-floor route | Routes on different floors are displayed correctly |
| Route coordinates | Route aligns with the map |
| Route update | Does not disrupt the established map |
| Invalid Route | Can identify data that cannot be rendered |

### 7.3 Test Result Records

The following must be retained:

- SVG, floor, and Route used in testing.
- Expected visualization result.
- Actual rendering result.
- Whether map and route coordinate specifications are met.
- Any observed offsets, omissions, or anomalies.

Specific testing methods and acceptance thresholds will be established uniformly later.

## 8. Future Extensions

After completing V1, the following may be improved as appropriate:

- Map and route rendering performance.
- Map interaction experience.
- Continuous updates of the user's location.
- More comprehensive navigation visualization effects.

The above items are not additional mandatory V1 features.

## 9. Items Pending Confirmation

| Item | Status |
| --- | --- |
| Formal SVG format | Pending standardization |
| Formal Route format | Pending standardization |
| Standardized coordinate system | Pending formal confirmation |
| Floor data format | Pending standardization |
| Specific parameters and output interface for renderMap | Pending confirmation |
| Specific parameters and output interface for renderRoute | Pending confirmation |
| Bridging method between Android and Three.js | Pending confirmation |
| Three.js and related dependency versions | Pending confirmation |
| Exception reporting specification | Pending project-wide standardization |

## 10. V1 Completion Criteria

To complete V1, the 3D Team must:

1. Complete the `renderMap()` map rendering function.
2. Complete the `renderRoute()` route rendering function.
3. Correctly render single-floor and multi-floor maps using standardized SVG.
4. Support 360-degree viewpoint rotation.
5. Correctly overlay the navigation route on the map using standardized Route.
6. Complete tests of map and route rendering correctness.
7. Provide the rendering functions for use by the UI Team.
8. Comply with project development guidelines and shared data specifications.

The 3D Team may independently determine internal scene management, helper functions, and rendering implementation methods, but must not violate confirmed cross-team interface and data specifications.
