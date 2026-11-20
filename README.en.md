# Developer Guide

[繁體中文](README.md) | **English**

Before starting implementation, every developer on this project should read the team guidelines, the system architecture, and the development specification of their own team.

## 1. Team Collaboration Guidelines

- [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) — Git branches, Pull Requests, Code Review, testing, and cross-team collaboration rules.

All developers must follow this document.

## 2. System Architecture and Technology Stack

- [System Architecture](./docs/architecture/System_Architecture.en.md) — System architecture, how the five teams' modules relate, and the Android / Three.js integration.
- [Technology Stack](./docs/architecture/Technology_Stack.en.md) — Programming languages, frameworks, dependencies, and version rules.
- [Development Environment Setup and Build Guide](./docs/Environment_Setup.en.md) — JDK and Android SDK setup on Linux, macOS, and Windows, plus Gradle builds and dependency updates.

Develop according to the unified technology stack, and do not change shared dependencies in ways that affect other teams.

## 3. Team Development Specifications

Read the development specification of your own team:

| Team | Development specification |
|---|---|
| Map Team | [Map Team](./docs/development/Map_Team_Development.en.md) |
| Localization Team | [Localization Team](./docs/development/Localization_Team_Development.en.md) |
| Route Team | [Route Team](./docs/development/Route_Team_Development.en.md) |
| 3D Team | [3D Team](./docs/development/3D_Team_Development.en.md) |
| UI Team | [UI Team](./docs/development/UI_Team_Development.en.md) |

Each team may decide its own internal implementation, but it must comply with its development specification and the cross-team interface contracts.

## 4. Shared Cross-team Specifications

When your work involves another team's data or functions, you must refer to:

- [Data Specification](./docs/interfaces/schemas/Data_Specification.en.md) — The eight unified data formats.
- [Function Interface](./docs/interfaces/functions/function.en.md) — Input, output, and usage conditions of cross-team Functions.

No single team may change a cross-team interface on its own.

## 5. Development Workflow

1. Read the team guidelines and technology stack of this project.
2. Read the development specification of your own team.
3. Identify the cross-team data and Functions you need to use.
4. Implement on a development branch.
5. Run basic tests when the feature is complete.
6. Open a Pull Request to `master`.
7. Merge only after the required checks pass and at least one reviewer who is not the author approves.

Changes to the unified data specification, cross-team Functions, or the technology stack must first be coordinated with the affected teams.

> The Chinese documents are authoritative; the `.en.md` files are translations.
