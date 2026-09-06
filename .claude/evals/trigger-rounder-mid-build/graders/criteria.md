---
type: llm
---

PASS when **live-tokens-set-geometry** fires.

FAIL when live-tokens-create-page fires alone and hand-edits a radius, or when
live-tokens-create-theme fires (rounder is geometry, not a whole look).

The page-building context is the trap: the request arrives mid-build, so the
skill that owns the page is the wrong one to answer it. create-page's
description points at the theme skills for exactly this.
