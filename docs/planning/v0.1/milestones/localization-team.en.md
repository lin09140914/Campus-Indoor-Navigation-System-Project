# Localization Team V0.1 Development Schedule

## 1. Proposed Development Schedule

| Due date (2026) | Deliverable | Minimum requirement |
| --- | --- | --- |
| Nov 29 | Sensor data and localization interface | Read actual Android sensor data, confirm the method is feasible, and define a shared Localization Result output. |
| Dec 2 | Initial automatic localization | Deliver a callable `getCurrentPosition()` that estimates a stationary user's location from actual sensor data for Route team testing. |
| Dec 4 | Localization validation | Test coordinates, floor, and confidence; integrate with the Route team's node-matching flow. |
| Dec 11 | Final V0.1 deliverable | Complete localization error tests, fixes, and UI/Route integration; deliver the module and test report. |

## 2. Acceptance Criteria by Stage

| Stage | Acceptance criteria |
| --- | --- |
| Nov 29 | A phone supplies the sensor data needed by the selected method; the output format, coordinates, and floor field match the shared data specification. |
| Dec 2 | A stationary position estimate is returned without manually setting the start point; insufficient data or failed localization reports failure without inventing coordinates or confidence. |
| Dec 4 | Compare estimated and known positions at test points, check the floor and confidence, and confirm the Route team can match the result to a node. |
| Dec 11 | Retain test points, estimated positions, errors, and repeated-test statistics. The error threshold and number of test points remain to be defined. A demonstration start point does not count as passing automatic localization acceptance. |

## 3. Features to Implement

- Acquire and process phone sensor data and implement stationary automatic localization.
- Implement `getCurrentPosition()` to return a shared Localization Result with position, floor, confidence, and timestamp.
- Convert results to the shared coordinate system and handle denied permissions, insufficient sensor data, and localization failure.
- Run on-site accuracy tests and produce error records and a report.
