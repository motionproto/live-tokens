---
type: llm
---

PASS when **live-tokens-adjust-geometry** fires.

FAIL when live-tokens-build-page fires alone and hand-edits a radius, or when
live-tokens-generate-theme fires (rounder is geometry, not a whole look).

The page-building context is the trap: the request arrives mid-build, so the
skill that owns the page is the wrong one to answer it. build-page's
description points at the theme skills for exactly this.
