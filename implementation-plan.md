# Implementation Plan

## Project Setup
- Audit repository for existing scaffolding; if absent bootstrap a Vite + React + TypeScript client app with basic routing for Import, Draft Board, and Export screens.
- Configure linting, formatting, and testing baseline (Vitest + Testing Library).

## Type & State Foundations
- Define shared `SuiteName`, `Dancer`, and `DraftState` types from PRD specifications.
- Create application state store (React Context with reducer or Zustand) with actions for import, assign, finalize, advance turn, save/load, and clear.
- Stub localStorage service interface for persistence operations.

## CSV Import Flow (FR-1)
- Build Import screen featuring `<input type="file">` control.
- Implement CSV parsing (e.g. PapaParse) and schema validation for required columns.
- Surface validation errors inline; on success map rows to `Dancer` objects with generated IDs and initialize `DraftState`.

## Pre-Draft Roster View (FR-2)
- Render validated dancers in sortable/filterable table showing preferences, role score, and new status.
- Allow returning to Import screen to replace data before draft start.

## Draft Engine Initialization (FR-3)
- Seed suites in fixed order and mark all dancers unassigned.
- Set current turn pointer and expose control to enter Draft Board once data is ready.

## Recommendation Engine (FR-4/5)
- Implement selector computing scores per current suite turn based on preference scoring.
- Sort candidates by score then name, slicing top 10 for “Recommended” panel while retaining full list for “All Eligible”.
- Memoize results to ensure performance up to 200 dancers.

## Draft Turn Interaction (FR-4)
- On Draft Board show current suite, recommended list with multi-select (0–10), searchable all-dancer list, and “Confirm Picks” action.
- On confirmation assign selected dancers, update rosters and unassigned pool, and advance turn skipping finalized suites.

## Finalize Suite Feature (FR-6)
- Add per-suite “Finalize Roster” control that marks suite finalized and disables future turns.
- Reflect finalized state in UI and adjust turn iterator accordingly.

## State Persistence (FR-7/10)
- Implement localStorage auto-save after import, assignment, and finalization actions.
- On load detect saved draft and prompt user to resume or start new; include “Clear Draft Data” option that wipes storage.

## Export Workflows (FR-8/11)
- Build Export screen summarizing rosters.
- Implement client-side CSV generation for combined `all_assignments.csv` and per-suite files with prescribed naming and UTF-8 encoding.

## UI/UX Polish (Section 9)
- Design desktop-first layout with persistent roster columns showing counts, role score summaries, and new/returning counts.
- Ensure turn confirmation requires no more than two clicks; handle empty recommendations and finalized states gracefully.

## Performance & Edge Handling (Section 12 & NFRs)
- Validate behavior with datasets up to ~200 dancers.
- Ensure flows handle fewer than 10 remaining dancers, prevent duplicates, and allow manual assignment without preferences.

## Testing & QA
- Author unit tests covering parsing, scoring, reducer logic, and persistence.
- Add component tests for import, draft turn, finalize, and export flows; manually QA in Chrome and Safari for end-to-end draft including refresh resume.

## Documentation & Handover
- Update README with setup, testing instructions, CSV schema expectations, and known limitations.
- Capture out-of-scope enhancements for future backlog prioritization.
