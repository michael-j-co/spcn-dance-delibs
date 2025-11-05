# Final Edits — DnD Roster Layout Plan

This plan builds on docs/final-edits-stage-plan.md and focuses on a new Final Edits layout that:
- Shows each suite roster side-by-side, including clear Newbie and M/F ratios.
- Supports drag-and-drop to move dancers between the five suite rosters.

## Goals

- Provide at-a-glance roster health per suite (counts, Newbie ratio, M/F ratio).
- Enable intuitive cross-roster adjustments via drag-and-drop.
- Preserve accessibility and a non-DnD fallback.
- Keep state updates consistent via existing `moveDancer`/`unassignDancer` actions.

## Metrics Model

We already have `isNew: boolean` and a numeric `roleScore` (treated as M/F preference score). Define buckets and helpers:

- M/F buckets by `roleScore` (same thresholds used in current roster average):
  - Fem-leaning: `roleScore <= 4`
  - Neutral: `roleScore === 5`
  - Masc-leaning: `roleScore >= 6`
- Newbie ratio: `newCount / total`.

Add `app/src/lib/metrics.ts`:
- `getGenderBucket(score: number): 'F' | 'N' | 'M'`
- `calcRosterMetrics(dancers: Dancer[])` → `{ total, newbies, returning, masc, fem, neutral, newbieRatio, mascRatio, femRatio }`
- Keep pure and unit-testable.

## Layout & UX

Screen: Final Edits (replaces existing table view)
- Grid with 5 columns: one for each Suite.
- Each column has:
  - Header: Suite name and badges:
    - `Total: X`
    - `New: Y (Z%)`
    - `M/F: M:F` (plus Neutral count if present)
  - Scrollable list of dancer cards.
- Dancer card shows: name, `RoleScore` pill, New/Returning tag, preferences chips (small).
- Drag behavior:
  - Drag a dancer card; drop into any of the five suite columns to move.
  - Visual highlight on valid drop targets.
- Fallback actions:
  - Each card keeps a small “Move” dropdown + button for keyboard use (uses the same actions under the hood).

## Drag-and-Drop Approach

Prefer built-in HTML5 Drag & Drop (no extra dependency):
- Draggable: `role="listitem" draggable` on dancer cards
- Drop zones: column lists with `onDragOver` (preventDefault), `onDrop`
- Data payload: `dataTransfer.setData('text/plain', JSON.stringify({ dancerId, from }))`
- On drop: parse payload, compute `to` based on target column, dispatch:
  - `moveDancer(dancerId, to)`

Keyboard/Accessibility:
- Ensure focus styles; ENTER on a focused “Move” button uses the non-DnD path.
- ARIA roles: columns `role="list"`, items `role="listitem"`.

## Consistency With Draft Board

Maintain consistent data representation and visual language with the existing Draft Board:
- Suite ordering and identity
  - Always render columns in `SUITE_NAMES` order.
  - Use `formatSuiteName(suite)` to derive stable CSS class names.
  - Apply palette from `getSuiteColor(suite)` and active color theming consistent with `App.tsx`.
- Roster sourcing
  - Derive roster dancers from `state.suites[suite].ids` → map to `state.dancers` via a local lookup Map, matching `DraftBoard`.
  - Treat `assignedSuite` as the source of truth and keep it synchronized (already handled by reducer actions).
- Dancer row/card semantics
  - Reuse `RoleScore` component for role score display.
  - Reuse `SuiteChip` for preference chips (first/second/third), same as Draft Board tables.
  - Show `New?` as `Yes/No`, identical to Draft Board.
  - Sort lists by `fullName` ascending, matching roster cards in `DraftBoard`.
- Finalized indicator
  - Display a `Finalized` badge in the column header if `state.suites[suite].finalized`, matching Draft Board labeling.
- Metrics alignment
  - Keep the existing average role score concept visually compatible; additional M/F ratio derives from the same `roleScore` scale and should not conflict with current good/bad average styling.

## Implementation Steps

1) Metrics helpers
- Add `app/src/lib/metrics.ts` with bucket and ratio functions.
- Add lightweight unit tests for the helpers (optional but recommended if tests are present nearby).

2) Final Edits view structure
- Create `FinalEditsBoard` within `app/src/pages/FinalEditsScreen.tsx` or a new component file under `components/`:
  - Build a 5-column CSS grid.
  - Columns: `SUITE_NAMES`.
  - For each column, compute metrics using `calcRosterMetrics` on the roster’s dancer list.
  - Render metrics badges in the header and a `Finalized` badge when applicable.
  - Reuse `RoleScore` and `SuiteChip` for card content, and `formatSuiteName`/`getSuiteColor` for styling consistency.

3) DnD wiring
- DancerCard: add `draggable` and `onDragStart` to set payload with `{ dancerId, from }`.
- Column list: add `onDragOver` to allow drop, `onDrop` handler to parse payload and call store actions.
- Visual feedback: apply `is-drag-over` class while a dragged item is hovering.

4) Fallback move controls
- For each card, keep a compact select (five suites) and a `Move` button.
- Disable `Move` when target equals current.
- Optional: include an explicit “Unassign” action in the card’s overflow menu for edge cases (not a DnD target).

5) Styling
- Add `.final-edits-grid` and `.final-column` styles to `app/src/App.css`:
  - Responsive single-column stack on small widths.
  - Sticky column headers with metrics badges.
  - Scrollable roster lists with min-heights.

6) State updates
- Reuse `moveDancer` and `unassignDancer` already implemented in `DraftProvider`.
- No state shape changes.

7) Edge cases & Guards
- Moving to same roster → no-op (already handled by reducer).
- Moving from finalized suite → allowed; show a small “finalized” badge on that column.
- Prevent duplicates via reducer Set logic.

8) QA checklist
- Drag/drop dancer from Suite A to B updates both columns and metrics.
- Optional unassign via card action updates suite metrics and unassigned count (if displayed elsewhere).
- Search (if retained) filters visible items but still allows dragging shown items.
- Page refresh preserves edits; export reflects new assignments.

## Developer Notes

- Avoid new dependencies to keep client-only, offline-friendly behavior.
- Keep DnD minimal and resilient; do not over-engineer nesting.
- Metrics thresholds can be extracted to constants if directors want to tune them later.
