# Campus Indoor Navigation System V1 — Localization Team Development Specification

**Document Version:** V0.1 (Draft)  
**Responsible Team:** Localization Team  
**Applicable Scope:** V1  
**Status:** Pending confirmation of cross-team data specifications

---

## 1. Development Objectives

The Localization Team is responsible for automatically estimating the user's location inside a building using mobile phone sensor data and indoor localization algorithms, and providing that location to other teams.

The core V1 tasks of this team are:

1. **Automatic stationary localization:** While the user remains stationary indoors, estimate the location using sensors and localization algorithms and output a localization result in a standardized format.
2. **Localization accuracy evaluation:** Calculate localization errors through actual testing and produce a test report.

After completing V1, continuous localization and accumulated drift during user movement may be addressed further.

The Localization Team is not responsible for map construction, route planning, 3D rendering, or UI development.

## 2. Scope of Work and Deliverables

| Work Item | Deliverable | V1 Requirement |
| --- | --- | --- |
| Acquisition and processing of mobile phone sensor data | Data required by the localization algorithm | Required |
| Automatic stationary localization | Localization function | Required |
| Standardized localization result output | Localization results compliant with the shared specifications | Required |
| Localization accuracy testing | Test programs and error report | Required |
| Localization during movement and drift correction | Continuous location tracking capability | Optional later enhancement |

V1 does not require users to manually set starting coordinates or continuously update their location while walking.

## 3. Main Function Specifications

### 3.1 getCurrentPosition()

**Function:** Automatically estimate the user's location using mobile phone sensor data and localization algorithms.

**Tentative Function:** `getCurrentPosition()`

### Input

| Input | Description |
| --- | --- |
| Sensor data | Mobile phone sensor information required by the localization algorithm |
| Localization reference data | Map or other reference data required by the localization algorithm |

The actual sensors used are determined by the Localization Team according to the algorithm's requirements.

### Output

Output data that complies with the project-wide standardized localization result format.

Expected contents:

- Coordinates of the user's location.
- Floor on which the user is located.
- Localization Confidence.

Specific field names, types, numerical ranges, and units are determined by the standardized localization result specification.

### Basic Processing Flow

1. Obtain the sensor data required for localization.
2. Perform necessary data processing.
3. Estimate the user's location using a localization algorithm.
4. Convert the estimated result to the standardized coordinate system.
5. Output the standardized localization result.

### Exceptional Conditions

The following conditions must be identifiable:

- Sensor data is insufficient or unavailable.
- Required localization reference data is missing.
- Localization fails.
- The confidence of the localization result is insufficient.
- An error occurs during localization calculation.

The detailed error reporting format shall be determined according to the project-wide exception handling specifications established later.

## 4. Standardized Data Specifications

### 4.1 Standardized Coordinate System

**Related Teams:** All five teams

Coordinates output by the Localization Team must comply with the project-wide shared coordinate system, including the origin, directions of coordinate axes, units, and floor definitions.

### 4.2 Localization Result Format

**Data Provider:** Localization Team  
**Data Users:** UI, Route Planning, and 3D Teams

Localization results must use a standardized format so that the Route Planning Team can match locations to the navigation graph and the 3D Team can correctly display the user's location.

### 4.3 Floor Data

The Localization Team must use the project-wide standardized floor identification method and must not independently define floor numbers that are incompatible with those used by other teams.

### 4.4 Confidence Definition

The meaning, permitted range, and interpretation of localization Confidence must be clearly defined.

The Confidence of a single localization result is not equivalent to the localization error measured against an actual reference location.

Formal fields and data structures shall follow the project's eight standardized data specifications.

## 5. Cross-Team Handoffs

| Related Team | Handoff Data | Purpose |
| --- | --- | --- |
| Map Team | Standardized coordinates and necessary map reference information | Map localization results to building space |
| UI Team | Localization result | Provide the starting position for user navigation |
| Route Planning Team | Localization result | Match navigation nodes and calculate routes |
| 3D Team | Localization result | Display the user's location |

The Localization Team is responsible for generating location information, not for drawing the location in the 3D scene.

## 6. Development Environment and Dependencies

The Localization Team must comply with the project's Android application architecture.

Development principles:

- Kotlin is the recommended primary language on the app side; the actual version follows shared environment specifications.
- Native Android sensor APIs may be used.
- The localization algorithm and necessary libraries may be selected independently by the Localization Team.
- IDE selection is unrestricted.
- Third-party dependencies must comply with the project's compatibility and development guidelines.
- Cross-team data must use the standardized format.

The actual sensor types, algorithms, and dependency versions shall be specified by the Localization Team before formal development begins.

## 7. Testing and Acceptance Requirements

### 7.1 Localization Functionality Tests

| Test Item | Acceptance Criteria |
| --- | --- |
| Automatic localization | Estimate the user's location without manually entering initial coordinates |
| Localization at different positions | Perform localization at different positions within the test area |
| Floor identification | Provide localization results according to the standardized floor specification |
| Coordinate output | Comply with the standardized coordinate system |
| Confidence | Output complies with the formal definition |
| Exceptional input | Identify localization failures and insufficient data |

### 7.2 Localization Accuracy Tests

Localization should be performed at test points with known actual locations, and differences between localization results and reference locations should be calculated.

At a minimum, record:

- Actual reference location.
- Location estimated by the algorithm.
- Localization error.
- Test floor and location.
- Error statistics from repeated tests.

### 7.3 Test Result Records

Test reports should make it possible to determine whether the localization method meets V1 requirements.

The number of test points, localization error threshold, and statistical metrics will be established uniformly later.

## 8. Future Extension: Localization During Movement

After completing V1, further research may include:

- Continuous localization while the user is walking.
- Continuous updates of localization results.
- Correction of accumulated drift.
- Localization stability during movement.

The above items are not part of the mandatory V1 acceptance requirements.

## 9. Items Pending Confirmation

| Item | Status |
| --- | --- |
| Standardized coordinate system | Pending formal confirmation |
| Localization result data format | Pending standardization |
| Confidence definition | Pending standardization |
| Floor data format | Pending standardization |
| Sensors and localization reference data | Pending confirmation by the Localization Team |
| Specific function parameter types | Pending confirmation |
| Localization accuracy acceptance threshold | To be established |
| Exception handling format | Pending project-wide standardization |
| Development dependencies and versions | Pending confirmation |

## 10. V1 Completion Criteria

To complete V1, the Localization Team must:

1. Complete the `getCurrentPosition()` localization function.
2. Perform automatic stationary localization using sensor data and a localization algorithm.
3. Not require the user to manually enter a starting location.
4. Output localization results compliant with the standardized format.
5. Complete localization accuracy tests and submit an error report.
6. Comply with standardized coordinate, floor, and development guidelines.

Localization during movement, continuous tracking, and drift correction are not part of the mandatory V1 acceptance requirements.

The Localization Team may independently decide on internal algorithms, helper functions, and development tools, but must comply with project development guidelines.
