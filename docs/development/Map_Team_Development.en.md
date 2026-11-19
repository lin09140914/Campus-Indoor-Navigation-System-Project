# Campus Indoor Navigation System V1 — Map Team Development Specification

**Document Version:** V0.1 (Draft)  
**Responsible Team:** Map Team  
**Applicable Scope:** V1  
**Status:** Pending confirmation of cross-team data specifications

---

## 1. Development Objectives

The Map Team is responsible for creating indoor map data for campus buildings, providing other teams with the data needed for localization, navigation route calculation, and 3D visualization.

The core V1 tasks of this team are:

1. **Create and deliver map data in standardized formats:** SVG floor plans, Graph navigation graphs, and node mapping tables.
2. **Implement a map error evaluation program:** Verify positional, distance, and scale errors between the map and the actual building space.

The Map Team is not responsible for navigation algorithms, mobile phone localization algorithms, 3D rendering, or UI development.

## 2. Scope of Work and Deliverables

| Work Item | Deliverable | V1 Requirement |
| --- | --- | --- |
| Floor plan creation | Standardized SVG floor plans | Required |
| Navigation graph creation | Standardized Graph | Required |
| Mapping nodes to actual locations | Standardized node mapping table | Required |
| Map error evaluation | Error evaluation program and test report | Required |

The three types of map data must represent the same building space and comply with the project-wide coordinate, floor, and ID conventions.

## 3. Main Function Specifications

### 3.1 evaluateMapError()

**Function:** Evaluate errors in map data relative to actual measurement data.

| Item | Specification |
| --- | --- |
| Function Name | `evaluateMapError()` (tentative) |
| Input 1 | Map data |
| Input 2 | Actual measurement reference data |
| Output | Map error evaluation results |
| Intended Users | Map Team testing and acceptance |
| When Used | After map creation and after map modifications |

Error evaluation should cover differences between actual measurements and map coordinates or distances, and produce results that can be reviewed.

Specific parameter types, error calculation formulas, acceptance thresholds, and report formats will be confirmed later.

This function is an offline testing tool for map data; the UI Team is not required to call it during navigation.

## 4. Standardized Data Specifications

### 4.1 SVG Floor Plans

**Data Provider:** Map Team  
**Primary Recipient:** 3D Team

The data must comply with the project-wide standardized SVG specification, including:

- The spatial structure of floor plans for each floor.
- Consistent drawing dimensions, scale, and coordinate transformation rules.
- Floor identification and corresponding drawing relationships.
- The ability for the 3D Team to correctly construct floor maps.

### 4.2 Graph Navigation Graph

**Data Provider:** Map Team  
**Primary Recipient:** Route Planning Team

The data must comply with the standardized Graph specification, including:

- Navigation nodes and their positions.
- Connections between nodes.
- Edge weights and permitted modes of travel.
- Staircase and elevator connections between floors.

The Graph must be usable by the Route Planning Team to perform A\* route planning.

### 4.3 Node Mapping Table

**Data Provider:** Map Team  
**Primary Recipients:** Route Planning Team, UI Team

A mapping between actual locations and navigation nodes must be established, including:

- Navigation node identifiers.
- Room or destination identifiers.
- The floor on which each location is situated.
- Mappings between locations and navigation nodes.

### 4.4 Consistency of Shared Data

All three datasets must follow the same coordinate and identification standards. In particular, verify that:

- The same location has consistent spatial meaning in SVG and Graph.
- Graph nodes referenced by the node mapping table actually exist.
- Floors, location IDs, and related data correspond correctly.
- All affected data is updated together after map corrections.

**The specific fields, types, and file formats in this section are subject to the eight standardized data specifications to be formally published later.**

## 5. Cross-Team Handoffs

| Receiving Team | Delivered Data | Purpose |
| --- | --- | --- |
| 3D Team | SVG, related floor and coordinate data | Single-floor/multi-floor map rendering |
| Route Planning Team | Graph, node mapping table | Route planning and location matching |
| UI Team | Location/node mapping data | Allow users to select destinations |
| Localization Team | Shared coordinates and necessary map reference information | Allow localization results to correspond to the map |

Data used by all teams must comply with the same version of the shared data contract.

## 6. Development Environment and Dependencies

The Map Team may independently choose the programming languages and tools needed for map drawing, data organization, and error testing.

Development constraints:

- IDE selection is unrestricted.
- Delivered data must comply with standardized cross-team specifications.
- The finalized coordinate system and shared data structures must not be modified independently.
- New dependencies and development workflows must comply with project development rules.
- The error evaluation program must include execution and usage instructions.

The actual tools, dependency names, and versions are to be confirmed by the Map Team.

## 7. Testing and Acceptance Requirements

### 7.1 Map Data Acceptance

| Test Item | Acceptance Criteria |
| --- | --- |
| SVG completeness | Required floors and map elements are displayed correctly |
| Graph correctness | Navigation nodes and edge connections match actual traversable space |
| Node mapping table | Locations are correctly mapped to navigation nodes |
| Coordinate consistency | SVG, Graph, and actual positions comply with the shared coordinate conventions |
| Inter-floor connections | Staircase and elevator floor connection information is correct |

### 7.2 Map Error Evaluation

Tests must use actual reference measurement data, and the following must be retained:

- Test locations or test areas.
- Actual measured values and corresponding map values.
- Calculated errors.
- Error statistics and test conclusions.

Specific error thresholds and numbers of tests will be established later.

## 8. Items Pending Confirmation

| Item | Status |
| --- | --- |
| Formal SVG specification | Pending standardization |
| Formal Graph specification | Pending standardization |
| Formal node mapping table specification | Pending standardization |
| Shared coordinate and floor standards | Pending standardization |
| Map error calculation method and acceptance threshold | Pending confirmation |
| Development tools and dependency versions | To be provided by the Map Team |

---

## 9. V1 Completion Criteria

To complete V1, the Map Team must:

1. Deliver SVG, Graph, and node mapping tables that comply with the standardized specifications.
2. Ensure the three datasets are consistent with each other and usable by the relevant teams.
3. Complete the map error evaluation program.
4. Submit actual test results that meet the acceptance standards to be confirmed later.
5. Comply with the project's standardized development and data specifications.

Other internal functions, algorithms, and development tools may be decided independently by the Map Team.
