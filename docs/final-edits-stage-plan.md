# Final Edits Stage — Implementation Plan

## Overview

Add a new “Final Edits” stage that appears after the draft completes but before export. In this stage, authorized users can manually move dancers from one suite to another (or unassign/reassign), while keeping auto-save and export flows intact.

Goals:
- Provide a clear, single place to do last-minute roster corrections.
- Support moving any assigned dancer between suites and assigning any unassigned dancer to a suite.
- Persist all edits to localStorage using the existing draft state mechanism.
- Keep export format unchanged, based on the authoritative `assignedSuite` and suite roster ids.

Out of scope (for now):
- Undo/redo history.
- Auto-balancing by role/experience.

## UX Changes

- Entry point: After drafting ends (all dancers assigned OR all suites finalized or no remaining active turns), show a call-to-action: “Proceed to Final Edits”.
- Screen: “Final Edits” view with:
  - Left panel: Unassigned dancers.
  - Center: Five suite columns with current rosters.
  - Right panel: Selected dancer details and a move control.
  - Global search box to find a dancer quickly.
- Interactions:
  - Select a dancer from any list, choose a destination suite via dropdown, then click “Move”.
  - Optionally provide an “Unassign” action to move a dancer back to the unassigned pool.
  - Changes auto-save immediately.
- Exit point: “Export CSVs” button that leads to existing export flow.

## Data Model Changes

No schema changes required. Keep using `DraftState`:
- `Dancer.assignedSuite?: SuiteName` is the source of truth for where a dancer is assigned.
- `DraftState.suites[SuiteName].ids` must remain in sync with assignments.
- `DraftState.unassignedIds` must remain in sync with dancers that have `assignedSuite === undefined`.

Add two new reducer actions in `app/src/types.ts`:
- `MOVE_DANCER` with payload `{ dancerId: string; from?: SuiteName; to?: SuiteName }`
  - Moves dancer across suites, and updates `unassignedIds` accordingly (details below).
- `UNASSIGN_DANCER` with payload `{ dancerId: string }`
  - Convenience action to send a dancer to the unassigned pool.

Note: We could implement only `MOVE_DANCER` and use `to` omitted to represent unassign, but explicit `UNASSIGN_DANCER` improves clarity.

## Reducer Logic

File: `app/src/state/DraftProvider.tsx`

Implement handling for new actions:

- MOVE_DANCER
  - Preconditions:
    - Dancer id must exist.
    - Destination suite (`to`) must be one of `SUITE_NAMES` OR undefined (undefined → unassign).
  - Steps:
    1. Determine `sourceSuite` from `dancer.assignedSuite` (ignore provided `from` unless used for extra validation/logging).
    2. If `to` equals `sourceSuite`, no-op.
    3. If `sourceSuite` is set, remove `dancerId` from `suites[sourceSuite].ids`.
    4. If `to` is set, add `dancerId` to `suites[to].ids`; update `assignedSuite` accordingly.
    5. Update `unassignedIds`:
       - If `to` set → ensure `dancerId` NOT in `unassignedIds`.
       - If `to` undefined → ensure `dancerId` IS in `unassignedIds`.

- UNASSIGN_DANCER
  - Steps are equivalent to `MOVE_DANCER` with `to = undefined`.

Auto-save continues to work via the existing `useEffect` watcher.

## Stage Detection and Navigation

- Define a selector/helper to detect that drafting is “complete enough” to proceed to Final Edits:
  - Option A (simple): when the user clicks a “Finish Draft” button (new UI affordance) that is enabled only if at least one suite is finalized or all dancers are assigned or there are no remaining active suites.
  - Option B (automatic): when there are no active suites left to draft (all finalized), reveal a banner to proceed.
- Routing: add a `FinalEdits` route/view under the existing app shell. Preserve access to “Back to Draft” in case the user wants to return.

## UI Implementation Steps

1. Add route/view: `app/src/routes/final-edits.tsx` (or colocate under existing pages) rendering the boards.
2. Build a shared roster list component showing dancers for a suite with search and select.
3. Add selection state for currently focused dancer and target suite dropdown + Move button.
4. Wire to store:
   - `dispatch({ type: 'MOVE_DANCER', payload: { dancerId, to: suite } })`
   - `dispatch({ type: 'UNASSIGN_DANCER', payload: { dancerId } })` for unassign.
5. Add guardrails in the UI:
   - Disable Move if `to` equals current suite.
   - Confirm dialog when moving from a finalized suite (allowed in Final Edits, but warn).
6. Add entry point in the post-draft UI: “Proceed to Final Edits”.

## Persistence

No new persistence keys. The existing `saveDraftState` and `loadDraftState` continue to serialize/deserialize `DraftState` including all edits.

## Export Flow

No changes to file formats in `app/src/lib/exporters.ts`.
- Exports continue to derive assignments from `assignedSuite` and suite roster ids.
- Ensure tests still pass: `app/src/lib/exporters.test.ts`.

## Edge Cases & Validation

- Moving an unassigned dancer to a suite: allowed.
- Moving a dancer to the same suite: no-op.
- Moving from a finalized suite: allowed in Final Edits stage; show a confirmation.
- Unassigning a dancer who is already unassigned: no-op.
- Duplicate ids in a suite roster: prevent by set semantics when adding.
- Keep `unassignedIds`, `suites[...].ids`, and `dancers[...].assignedSuite` strictly consistent.

## Step-by-Step Tasks (Engineering)

1) Types
- Update `app/src/types.ts` to add `MOVE_DANCER` and `UNASSIGN_DANCER` to `DraftAction`.

2) Reducer
- Update `app/src/state/DraftProvider.tsx` reducer with new cases and pure-state updates described above.
- Add helper to remove/add ids safely (avoid duplicates) if helpful.

3) Stage Toggle
- Add a lightweight stage flag in UI state (router or local state) to navigate to Final Edits after the draft. Optionally add a “Finish Draft” button.

4) Final Edits View
- Create the Final Edits board layout and search/selection.
- Implement Move/Unassign operations wired to the store.

5) UX Polish
- Confirmation when moving out of finalized suite.
- Badges for “Finalized”/“Unassigned count”.

6) Persistence & Export Sanity Check
- Manually verify that refreshing preserves edits and that export reflects latest edits.

7) Minimal Tests
- Add reducer unit tests for `MOVE_DANCER` and `UNASSIGN_DANCER` to validate state invariants.

## Rollout Considerations

- Backward compatibility: Loading an older saved draft without the new actions continues to work; actions only affect runtime.
- If desired, gate the Final Edits route behind a feature flag to ship incrementally.

## Acceptance Criteria

- Users can navigate to a Final Edits screen after drafting.
- Users can move any dancer from Suite A to Suite B and see both rosters update immediately.
- Users can unassign a dancer and reassign them to another suite.
- State remains consistent after page refreshes and across exports.
- Export files match the final on-screen rosters.

