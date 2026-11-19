# Campus Indoor Navigation System V1 — Route Planning Team Development Specification

**Document Version:** V0.1 (Draft)  
**Responsible Team:** Route Planning Team  
**Applicable Scope:** V1  
**Status:** Pending confirmation of cross-team data specifications

---

## 1. Development Objectives

The Route Planning Team is responsible for calculating navigation routes using the A\* algorithm based on the navigation graph (Graph) provided by the Map Team, the user's current location provided by the Localization Team, and the destination and mode of travel provided by the UI Team.

The core V1 tasks of this team are:

1. **Implement the route planning function:** Receive Graph, current position, destination, and mode of travel, and output a navigation route that complies with the project-wide standardized Route specification.
2. **Complete route feasibility and correctness tests:** Verify that generated routes are connected, comply with travel-mode restrictions, and are shortest paths under the current edge-weight definitions.

After completing the required V1 functionality, the team may further research and optimize Graph edge weights to improve route-planning quality.

The Route Planning Team is not responsible for map construction, mobile phone sensor-based localization, 3D rendering, or UI development.

## 2. Scope of Work and Deliverables

| Work Item | Deliverable | V1 Requirement |
| --- | --- | --- |
| A\* route planning | Route planning function | Required |
| Matching current position to navigation graph | Map localization coordinates to traversable navigation nodes | Required |
| Handling different modes of travel | Route searches supporting the specified mode of travel | Required |
| Inter-floor route planning | Navigation between floors via stairs and elevators | Required |
| Route feasibility and correctness testing | Test programs and test results | Required |
| Edge-weight optimization | Improved calculation of distance or other route costs | Optional later enhancement |

V1 does not require continuous tracking during user movement, dynamic replanning, or real-time obstacle avoidance.

## 3. Main Function Specifications

### 3.1 findRoute()

**Function:** Use the A\* algorithm to calculate a route from the user's current position to a specified destination, based on the input navigation graph and navigation requirements.

**Tentative Function:**

`findRoute(graph, currentPosition, destination, mode)`

### Input

| Parameter | Description | Data Source |
| --- | --- | --- |
| `graph` | Navigation nodes, edges, and weights | Map Team |
| `currentPosition` | User's current localized position | Localization Team |
| `destination` | Destination specified by the user | UI Team / Map Team data |
| `mode` | Mode of travel specified by the user | UI Team |

These parameters must comply with the project-wide standardized data specifications.

The `currentPosition` is a localization result; the user is not required to manually provide a starting node ID.

### Output

Output a navigation route compliant with the project-wide standardized Route format.

Expected information includes:

- Nodes traversed by the route and their order.
- Spatial coordinates corresponding to the route.
- Floors traversed by the route.
- Total route distance or cost.
- Necessary inter-floor and travel-mode information.

Specific field names, data types, and structures shall be defined according to the formally standardized Route specification to be established later.

### Basic Processing Flow

1. Receive Graph, Current Position, Destination, and Mode.
2. Map the current position to an appropriate traversable navigation node.
3. Obtain the navigation node corresponding to the destination.
4. Determine which edges are usable under the specified mode of travel.
5. Search for a route using A\*.
6. Convert the calculation result to the standardized Route format.
7. Return the route result for use by the UI and 3D Teams.

### Exceptional Conditions

The following conditions must be identifiable:

- Invalid Graph data.
- The current position cannot be matched to a traversable node.
- The destination does not exist or cannot be mapped to a node.
- No feasible route exists under the specified mode of travel.
- An error occurs during route calculation.

Detailed error codes, messages, and return methods will later be standardized according to the project-wide exception handling specification.

## 4. Standardized Data Specifications

### 4.1 Graph Navigation Graph

**Data Provider:** Map Team  
**Data User:** Route Planning Team

The Graph must conform to the project-wide standardized format.

Expected contents:

- Navigation nodes and position information.
- Connections between nodes.
- Edge weights.
- Floor and inter-floor connection information.
- Travel modes or edge types.

The Route Planning Team must not independently change the formally confirmed Graph format.

### 4.2 Localization Results

**Data Provider:** Localization Team  
**Data User:** Route Planning Team

Localization results must use the standardized coordinate system and allow the Route Planning Team to determine the user's location and floor.

The Route Planning Team must match localization results to usable navigation nodes, rather than assuming the localization coordinates are already located at Graph nodes.

### 4.3 Destinations and Node Mapping Table

**Data Provider:** Map Team  
**Data Users:** Route Planning Team, UI Team

The Route Planning Team must be able to find the traversable navigation node corresponding to a destination through standardized destination data and node mappings.

Destination IDs and Graph node IDs are not necessarily the same and must be mapped according to the shared data specifications.

### 4.4 Route Navigation Path

**Data Provider:** Route Planning Team  
**Data Recipients:** UI Team, 3D Team

Route must use the standardized data format to ensure that:

- The UI Team can receive and process route information.
- The 3D Team can correctly overlay the route on the map.
- Route coordinates and floors remain consistent with Graph.
- Inter-floor routes can be correctly identified.

**The formal fields, types, and structures of all data in this section are governed by the project's eight standardized data specifications.**

## 5. Cross-Team Handoffs

| Related Team | Handoff Data | Purpose |
| --- | --- | --- |
| Map Team | Graph, node mapping table | Establish navigation information needed for route search |
| Localization Team | Standardized localization result | Provide the navigation starting position |
| UI Team | Destination, mode of travel | Provide navigation requirements |
| UI Team | Standardized Route | Receive planning results and control subsequent display |
| 3D Team | Standardized Route | Overlay the route on the map |

The Route Planning Team is responsible only for calculating and outputting navigation routes, not for actually drawing them.

## 6. Development Environment and Dependencies

The route planning module must comply with the project's selected Android technical architecture and shared data specifications.

Current development principles:

- Kotlin is the recommended primary language for the Android application; the final choice follows the formal technical version specifications.
- IDE selection is unrestricted.
- Use the A\* algorithm for route planning.
- The use of an external shortest-path library is not mandatory.
- Internal data structures and helper functions may be designed independently by the Route Planning Team.
- New dependencies must meet the project's development and compatibility requirements.

Specific versions of Kotlin, Gradle, Android SDK, etc. shall follow the formal development environment documentation.

## 7. Testing and Acceptance Requirements

### 7.1 Route Feasibility Tests

| Test Item | Acceptance Criteria |
| --- | --- |
| Same-floor navigation | Finds a route compliant with Graph connectivity |
| Inter-floor navigation | Reaches the destination via valid staircase or elevator edges |
| Different travel modes | Produces routes compliant with specified traversal restrictions |
| Node matching | Reasonably maps the current position to a traversable node |
| Route validity | Every pair of adjacent nodes in the route is connected by a valid edge |
| Unreachable destination | Correctly identifies cases where no feasible route exists |
| Invalid destination | Correctly handles a destination that does not exist |

### 7.2 Route Correctness Tests

It must be confirmed that A\* output complies with the current Graph weight definitions.

At least 10 test cases are recommended, covering:

- Different starting and ending points.
- Comparisons among multiple candidate routes.
- Different modes of travel.
- Inter-floor navigation.
- Identical starting and ending points.
- Unreachable routes and invalid inputs.

Use known correct answers or independent calculations to verify the total route weight and shortest-path result.

### 7.3 Test Result Records

Each test case should record:

- The Graph used.
- Input current position, destination, and travel mode.
- Expected result.
- Actual returned result.
- Whether the test passed.

Test programs and records must be available for review by other teams or the integration team.

## 8. Future Extension: Edge-Weight Optimization

After the required V1 functionality is completed and passes testing, improvements to Graph Edge Weight may be considered.

Possible directions include:

- Adjusting weights based on actual walking distance.
- Evaluating the movement costs of stairs and elevators.
- Considering actual traversal conditions along different routes.
- Comparing route quality before and after weight adjustments.

If optimization requires changes to Graph data maintained by the Map Team, coordination with the Map Team and integration team is required first.

This item is not part of the mandatory V1 acceptance requirements.

## 9. Items Pending Confirmation

| Item | Status |
| --- | --- |
| Formal Graph data format | Pending standardization |
| Formal Route data format | Pending standardization |
| Localization results and coordinate system | Pending standardization |
| Destination and node mapping format | Pending standardization |
| Official allowed values for travel modes | Pending standardization |
| Specific function parameter types | Pending confirmation |
| Exception reporting format | Pending project-wide standardization |
| Development dependencies and versions | Pending formal environment specifications |

---

## 10. V1 Completion Criteria

To complete V1, the Route Planning Team must:

1. Complete the `findRoute()` route planning function.
2. Ensure the function accepts Graph, current position, destination, and mode of travel.
3. Output a route that complies with the project-wide standardized Route specification.
4. Support same-floor and inter-floor route planning.
5. Correctly handle different modes of travel and cases where no reachable route exists.
6. Complete route feasibility and correctness testing and submit the results.
7. Comply with the project's standardized data specifications and development guidelines.

Edge-weight optimization and dynamic route replanning during movement are not part of the mandatory V1 acceptance requirements.

Other internal functions, algorithm details, and development tools may be decided independently by the Route Planning Team in accordance with project guidelines.
