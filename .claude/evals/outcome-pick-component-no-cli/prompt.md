---
name: outcome-pick-component-no-cli
runs: 3
max_turns: 20
timeout_seconds: 300
allowed_tools:
  - Bash
  - Read
  - Glob
  - Grep
---

For each of the twelve requirements below, name the shipped `@motion-proto/live-tokens` component to use, the variant to set (when the component's props expose one that this requirement fixes), and the props that carry the requirement's specifics. When nothing in the catalogue fits, say so and name the skill that authors a new component instead. Consult the catalogue before answering; do not guess from memory. Give all twelve answers in a single numbered reply. Write no file.

End the reply with a block in exactly this form, one line per requirement, so the answers can be checked by pattern. The id is the component's lowercase id as the catalogue prints it, or `none` when nothing shipped fits. The variant is the value of the component's `variant` prop when the requirement fixes one, and `-` otherwise. Use no backticks, bold, or extra words inside the block.

```
ANSWERS
1: <id> <variant or ->
2: <id> <variant or ->
...
12: <id> <variant or ->
```

1. A "Save changes" action at the bottom of a settings form. The label has to make what happens unambiguous.
2. An inline control, sitting among other controls in a toolbar, that switches between a List view and a Grid view of the same set of records.
3. A page with five report types. Picking one swaps the whole content area below it for that report.
4. A checkout form where the reader picks one of four shipping methods, each with a line of eligibility text read before committing.
5. A field that captures the reader's street address. There is no predefined list of valid values.
6. A field that sets a maximum monthly budget between $0 and $2,000, where the position along a track carries the number's meaning, not a typed-in figure.
7. A setting called "Email notifications" that the reader flips on or off. It takes effect the moment it flips, and the two states share the setting's one name.
8. A brief message that appears after the reader saves a form, confirming the save worked, and that goes away on its own.
9. Before an account is permanently deleted, ask the reader to confirm. The action cannot be undone once it runs.
10. A view where the reader scans and compares 40 orders side by side, by date, status, and amount.
11. A shipping policy setting where the reader selects every country the policy applies to, as many as apply, from the full list.
12. A field where the reader finds one city by typing to filter a long list of options, rather than scrolling it.
