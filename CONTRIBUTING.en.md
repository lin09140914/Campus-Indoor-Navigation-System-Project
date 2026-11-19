# Campus Indoor Navigation System — Team Collaboration Guidelines (CONTRIBUTING)

> This is an English translation of the Chinese original (`CONTRIBUTING.md`). If the two differ, the Chinese original prevails.

- **Project name:** Campus Indoor Navigation System
- **Document version:** V0.1 (draft team collaboration guidelines; core merge rules confirmed)
- **Applies to:** All project developers
- **Applicable teams:** Map Team, Localization Team, Route Team, 3D Team, UI Team

> This document governs project collaboration and the merge process. Each team may design its own internal algorithms and helper functions, but they must comply with the confirmed shared data specifications, cross-team function interfaces, and technology stack. CI, detailed test cases, and QA standards that have not yet been established will be defined in a later phase.

---

## 1. Documentation

### 1.1 Basic Principles

1. Formal development documents use Markdown (`.md`) throughout.
2. Documents should clearly describe features, inputs, outputs, dependencies, and delivery requirements.
3. Cross-team collaboration follows the formal shared specifications; no team may modify another team's formal development requirements or cross-team contracts on its own.
4. When a code change makes a document inaccurate, the related documents must be updated at the same time.
5. Content that is not yet finalized must be marked "To be confirmed" and must not be treated as a formal specification.

### 1.2 Document Locations

| Document | Location |
| --- | --- |
| System architecture | `docs/architecture/System_Architecture.md` |
| Technology stack | `docs/architecture/Technology_Stack.md` |
| Development specs of the five teams | `docs/development/` |
| Eight unified data specifications | `docs/interfaces/schemas/Data_Specification.md` |
| Cross-team Functions | `docs/interfaces/functions/function.md` |
| Decision log | `docs/decisions.md` |
| Team weekly reports | `docs/weekly-reports/` |

### 1.3 Weekly Report Rules

Each team must **update its weekly report before Wednesday evening each week**, for use in the Thursday meeting. It must include at least:

- Work completed this week and current progress.
- Problems or blockers encountered.
- Matters that need help from other teams.
- Planned work for next week.

Features that are unfinished or unverified must not be marked as completed.

---

## 2. Git Branch Management and Merge Restrictions

### 2.1 Branch Purposes

| Branch | Purpose | Normal merge direction |
| --- | --- | --- |
| `main` | Stable version that has passed integration testing and QA | `master` → PR → `main` |
| `master` | Integration branch for each team's development results | Feature / fix / docs branch → PR → `master` |
| `feature/*` | New feature development | PR → `master` |
| `fix/*` | Bug fixes | PR → `master` |
| `docs/*` | Documentation changes | PR → `master` |

### 2.2 Branch Naming

The following convention is recommended:

```text
feature/<team>/<feature-name>
fix/<team>/<issue-name>
docs/<document-name>
```

Examples:

```text
feature/map/svg-parser
feature/localization/position-estimation
feature/route/astar-search
feature/3d/render-map
feature/ui/destination-selector
fix/route/invalid-node
docs/update-data-specification
```

### 2.3 Branch Protection Rules (Confirmed)

1. **Pushing directly to `main` and `master` is prohibited.**
2. **Any change merged into `main` or `master` must go through a Pull Request.**
3. **Every PR needs approval from at least one reviewer who is not the author.**
4. Force-pushing to `main` or `master` is prohibited, and these two branches must not be deleted without authorization.
5. Required reviews and merge restrictions must not be bypassed.
6. General development results enter `master` first; `main` only receives versions that have completed the required integration testing and QA.

The protection conditions must actually be applied in the GitHub repository using Rulesets or Branch Protection; this document does not itself restrict push permissions automatically.

### 2.4 Merge Flow

```text
Feature / Fix / Docs Branch
            |
            v
       Pull Request
            |
            v
Code Review + required basic checks
            |
            v
          master
            |
            v
   Integration Test + QA
            |
            v
     master → main PR
            |
            v
           main
```

`master` is the development integration branch; it does not mean full-system QA has been completed.

---

## 3. Pull Requests and Code Review

### 3.1 PR Submission Requirements

Each PR should state:

1. The purpose and main content of the change.
2. The files, modules, or teams involved.
3. Dependencies added, removed, or changed.
4. Whether it affects shared data formats or cross-team Functions.
5. The tests that were run and their results.
6. Known limitations, unresolved issues, and any help needed.
7. If the code involves a specification adjustment, whether the related documents were updated at the same time.

### 3.2 Code Review Rules (Confirmed)

1. **Every PR needs approval from at least one reviewer who is not the author.**
2. Authors must not approve their own PRs.
3. Reviewers must examine the actual changes, not merely press Approve.
4. When a cross-team interface is involved, the affected teams should be invited to review.
5. If a reviewer raises a problem that must be fixed, the author must fix it and complete the required review again.
6. A PR must not be merged until the required reviews and checks are complete.

### 3.3 Review Focus

- Whether it complies with the team's development specification and the shared data contracts.
- Whether the way cross-team Functions are called, and their inputs and outputs, are correct.
- Whether it introduces incompatible dependencies.
- Whether there are obvious logic errors, unmaintainable designs, or sensitive information.
- Whether the test record is sufficient to support the change.

Reviewers should not force other teams to change their internal algorithms or implementations without a specification or quality reason.

---

## 4. Handling Merge Conflicts

### 4.1 Basic Rules

1. The owner of the development branch where the conflict occurs is responsible for resolving the Merge Conflict.
2. Before resolving, understand the purpose of both sides' changes; do not simply delete other people's code you do not understand.
3. When another team's code is involved, coordinate with that team first.
4. After resolving, recompile and check the affected features, then update the PR.
5. The commit history of `main` or `master` must not be forcibly overwritten.
6. Before rewriting the history of a personal branch, confirm whether that branch is shared by several people.

### 4.2 Suggested Process

```text
Conflict found → confirm the changes → coordinate across teams (if needed)
        → resolve the conflict → recheck features → update the PR
```

---

## 5. Coding Standards

### 5.1 Basic Principles

1. Code should be readable and maintainable, and names should clearly describe their purpose.
2. Avoid unnecessary duplicate code and overly large single functions.
3. Do not leave debugging code that serves no purpose.
4. Do not commit secrets such as passwords, tokens, or private keys to the repository.
5. Do not modify the confirmed shared data formats or cross-team interfaces on your own.

### 5.2 Language Style

| Technology | Standard |
| --- | --- |
| Kotlin | Follow the official Kotlin code style |
| JavaScript | Use consistent naming, formatting, and ES Modules |
| JSON | Follow the unified data contracts and `snake_case` field naming |
| SVG | Follow the currently confirmed SVG data specification |
| Python (offline tools) | PEP 8 is recommended |

The specific formatters, linters, and check settings will be decided by the later project build configuration.

### 5.3 Team Implementation Autonomy

Each team may design its own internal Functions, algorithms, data structures, classes, and helper tools, provided this does not break the formal shared technology stack, data contracts, cross-team Functions, or the quality standards above.

---

## 6. Testing and Basic Pre-merge Requirements

### 6.1 Developer Responsibilities

Before submitting a PR, confirm that:

1. There are no known basic syntax errors.
2. It builds or runs normally in your development environment.
3. The changed feature has had executable basic tests completed.
4. It does not break features known to work.
5. When cross-team data is involved, inputs and outputs conform to the unified specifications.

If tests cannot be run, explain why in the PR; do not claim they passed.

### 6.2 When CI Is Not Yet Established (Confirmed)

1. **The PR author must manually run the available basic tests and report the test items and results in the PR.**
2. Reviewers should check that the test record is reasonable.
3. Tests that have not been run must be clearly marked.
4. Even without CI, approval from at least one reviewer who is not the author is still required before merging.

### 6.3 After CI Is Enabled (Confirmed)

1. The project designates the required CI Status Checks uniformly.
2. **A PR can only be merged after all required CI checks pass.**
3. When CI fails, it must be fixed and the checks rerun; it must not be skipped.
4. CI does not replace human Code Review.
5. If the CI infrastructure is abnormal, the integration lead must confirm how to proceed; individual members must not bypass the rules on their own.

### 6.4 Division of Testing

| Testing | Responsible party |
| --- | --- |
| Basic functionality, unit testing | Each team |
| Function contract testing | The team providing the Function and the team using it |
| Integration testing | The teams concerned and the integration lead |
| QA | QA / integration lead |

Merging `master` → `main` requires the necessary integration testing and QA to be completed first. Test cases, thresholds, CI, and the QA workflow will be defined later.

---

## 7. Change Management for Technology Stack, Data Formats, and Functions

### 7.1 Technology Stack Changes

Commonly used technologies and dependency versions follow `docs/architecture/Technology_Stack.md`.

Version changes to Kotlin, the Android SDK, Gradle / AGP, Compose, Three.js, AndroidX WebKit, and the like, that affect the shared environment or other teams, must first state the reason and compatibility impact, and then be coordinated with the teams concerned. Each team may manage internal tools that do not affect the shared environment on its own.

### 7.2 Unified Data Format Changes

Shared data formats follow `docs/interfaces/schemas/Data_Specification.md`.

Before changing required fields, types, IDs, floors, the coordinate system, Graph, Route, localization results, or SVG formats that affect compatibility, you must coordinate with the affected teams. No one may publish a format incompatible with the formal data contract on their own.

### 7.3 Cross-team Function Changes

Cross-team Functions follow `docs/interfaces/functions/function.md`.

When changing a Function name, Input / Output, return type, calling preconditions, or behavior that affects other teams, you must coordinate first. Each team may adjust its internal Functions freely, but must not thereby break cross-team contracts.

### 7.4 Common Change Process

```text
Propose change → explain reason and impact → cross-team coordination
        → confirm the plan → update specification and code together
        → Pull Request → Code Review / required checks → merge
```

Major architecture and cross-team specification decisions should be recorded in `docs/decisions.md`.

---

## 8. Team Collaboration and Handoff

### 8.1 Basic Principles

1. Each team should be clear about its own development scope and deliverables.
2. All cross-team data must follow the shared specifications.
3. Cross-team Functions should provide the necessary calling methods and usage notes.
4. When you find a problem affecting other teams, proactively notify the teams concerned.
5. Do not modify cross-team interfaces without coordination.

### 8.2 Handoff Items

| Providing team | Receiving team | Main deliverables |
| --- | --- | --- |
| Map Team | Route, 3D, UI, Localization | SVG, Graph, Node Mapping, Floor, Destination, and other data |
| Localization Team | UI, Route, 3D | Localization Function and the unified localization result |
| Route Team | UI, 3D | `findRoute()` and Route |
| 3D Team | UI | `renderMap()`, `renderRoute()`, and the rendering interface |
| UI Team | Other related teams | Integration requirements, function calls, and issue reports |

### 8.3 Feature Delivery Requirements

A cross-team delivery should state at least: the feature name and purpose, the data / Function specification it is based on, how to call or read it, the required Input / Output, tests completed, known limitations, and unfinished items.

If the documents do not cover a problem actually encountered, the teams concerned discuss it first and, if necessary, hand it to the integration lead to coordinate; if a formal shared specification must change, follow Section 7.

---

## 9. Application and Enforcement of These Guidelines

1. This document applies to all project developers.
2. Each team retains autonomy over its internal implementation, but must comply with the formal shared contracts.
3. All changes merged into `main` and `master` must go through a Pull Request.
4. Every PR needs approval from at least one reviewer who is not the author.
5. Before CI is enabled, a manual test record must be provided; after CI is enabled, the designated required checks must pass.
6. Official stable versions must complete the necessary integration testing and QA.
7. Specific automated tests, CI configuration, and QA acceptance criteria will be defined in a later phase.

> **Implementation reminder:** This document is a process guideline and does not automatically enable GitHub permission restrictions. Please separately configure Rulesets / Branch Protection for `main` and `master` in the Repository Settings, including requiring PRs, requiring approval from at least one non-author reviewer, blocking force pushes, and the required Status Checks once CI is enabled.
