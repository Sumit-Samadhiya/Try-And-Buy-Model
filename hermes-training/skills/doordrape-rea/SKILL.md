---
name: doordrape-rea
description: Investigate DoorDrape APKs, packaged JavaScript and observed browser behavior with available reverse-engineering tools and explicit evidence limits.
---

Use ordinary file search for a full source repository. Use REA when the question depends on a shipped APK/binary/package or runtime behavior unavailable from source. This is an operating guide, not installation of REA or its analysis engines.

Discover the actual available tools and schemas in the Hermes environment. If the full `reverse-engineer-anything` skill is installed, follow its relevant workflow. Do not assume Codex tool names are registered in Hermes.

Route by target: APK/package inspection for Android; JavaScript application analysis for extracted JS/ASAR; passive browser inspection for an authorized open page; binary analysis for native executables. Inspect before executing unknown targets. Run controlled scenarios only within the requested scope.

Record artifact path/digest when available, tool and version, exact evidence, inference and coverage gaps. A string or endpoint in a bundle proves presence, not reachability or successful execution. Static parsing does not prove a complete reconstruction or working app. For DoorDrape Android, start with `android-app/README.md` and the actual supplied APK.

If a tool/provider is absent, state the blocker and continue supported source or archive inspection. Do not claim decompilation, screenshots or runtime tests that did not run. Keep account credentials and captured private data out of reports.
