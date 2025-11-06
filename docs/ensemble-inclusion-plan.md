# Include Ensemble In Draft: Implementation Plan

Goal
- Treat “Ensemble” as a first‑class suite that participates in drafting turns, recommendations, rosters, final edits, and exports.
- Stop deleting/ignoring Ensemble during CSV parsing/cleaning.

Non‑Goals
- Do not include “Script” as a drafting suite; continue ignoring Script in preferences.
- No backend or network changes (app remains client‑only).

Summary Of Changes
- Data model: add `Ensemble` to `SuiteName` and related constants/colors.
- CSV parsing: recognize Ensemble as a valid suite; stop filtering it; keep filtering Script.
- Draft state: ensure suite creation/order includes Ensemble; add hydration migration for old saved drafts.
- UI: ensure theming and labels include Ensemble; minor copy update in Import screen.
- Export: Ensemble included automatically in suite summaries and CSVs.
- Tests: update CSV parsing tests and add a small migration test.

Affected Files (by area)
- Types/Constants/Colors
  - `app/src/types.ts`
  - `app/src/constants.ts`
  - `app/src/lib/colors.ts`
  - `app/src/App.css` (header gradient rule for Ensemble)
- CSV Parsing & Import
  - `app/src/lib/csv.ts`
  - `app/src/pages/ImportScreen.tsx` (copy update only)
  - `app/src/components/ColumnMapperModal.tsx` (no code change expected)
- Draft State & Flow
  - `app/src/state/DraftProvider.tsx` (add hydration migration helper)
  - `app/src/lib/storage.ts` (no change, used by migration)
- Recommendations/Export/Final Edits (mostly no logic changes)
  - `app/src/lib/recommendations.ts` (no change)
  - `app/src/lib/exporters.ts` (auto‑includes via `SUITE_NAMES`)
  - `app/src/pages/FinalEditsScreen.tsx` (no change)
  - `app/src/pages/DraftBoard.tsx` (no change)
- Tests
  - `app/src/lib/csv.test.ts`
  - `app/src/state/DraftProvider.test.tsx` (add migration assertion)
  - Any snapshots relying on exact suite list (if present)

Detailed Plan

1) Data Model & Constants
- Update `SuiteName` union to include `'Ensemble'`.
  - File: `app/src/types.ts:1`
  - Verify all generic uses of `Record<SuiteName, …>` compile with the new key.
- Add Ensemble to `SUITE_NAMES` and provide a color palette in `SUITE_COLORS`.
  - File: `app/src/constants.ts`
  - Pick palette similar to others (e.g., base `#10B981`, soft `rgba(16,185,129,0.18)`, contrast `#0B4F39`) or any distinct green/teal variant.
- Add a themed header gradient for Ensemble.
  - File: `app/src/App.css`
  - Add `.app-shell.suite-theme--ensemble .app-header { background: linear-gradient(135deg, <dark>, <base>); }` to match chosen palette.
- Colors helper code already keys off `SUITE_COLORS`; no further logic required.

2) CSV Parsing & Cleaning
- Stop deleting Ensemble during parse.
  - File: `app/src/lib/csv.ts`
  - Change `IGNORABLE_PREFERENCE_LABELS` from `['script', 'ensemble']` to `['script']`.
- Recognize Ensemble in normalization.
  - File: `app/src/lib/csv.ts`
  - Add `'Ensemble': ['ensemble']` to `SUITE_ALIASES` map so descriptive labels normalize correctly.
- Keep compressing preferences (later prefs shift up when earlier are empty); with Ensemble now valid, it must not be stripped.
- Update Import screen copy to remove the “ensemble” mention.
  - File: `app/src/pages/ImportScreen.tsx`
  - Replace the info banner text with: “Preferences are compacted: if earlier preferences are empty or marked as ‘script’, later preferences shift up to fill gaps.”

3) Draft State & Hydration Migration
- Initial state already enumerates suites via `SUITE_NAMES`; with Ensemble added, fresh drafts will include it automatically.
- Add a migration when hydrating a previously saved draft (missing Ensemble key/ordering):
  - File: `app/src/state/DraftProvider.tsx`
  - In the `HYDRATE` case (or just before it), run a migration function:
    - Ensure `suites` has an entry for any missing suite in `SUITE_NAMES` (create `{ ids: [], finalized: false }`).
    - Ensure `suiteOrder` contains all `SUITE_NAMES`. If missing, append missing suites to the end (or recompute order by calling the existing `computeSuiteOrder(s.dancers)` and then appending any missing suites).
    - Leave `unassignedIds`, `dancers`, and assigned suite IDs untouched.
  - Keep existing logic that recomputes `suiteOrder` if it’s empty.

4) Recommendations & Turn Flow
- No changes required. `buildRecommendations` ranks by a target `SuiteName`; with Ensemble included in state, it will work identically.
- Turn advancement uses `suiteOrder`; with Ensemble present, it naturally gets turns.

5) Export & Final Edits
- No code changes needed. `createSuiteSummaries` and per‑suite CSVs iterate `SUITE_NAMES`, so Encore is included once added.
- Final Edits column rendering maps over `state.suiteOrder`; Ensemble will appear there too.

6) UI & Theming
- Add the `suite-theme--ensemble` gradient to match other suites as noted above.
- Ensure `SuiteChip` displays Ensemble colors via `getSuiteColor` (automatic once constants updated).

7) Tests & Validation
- Update CSV parsing tests:
  - `app/src/lib/csv.test.ts`
    - Rename “ignores Script and Ensemble preference entries” → “ignores Script preference entries”.
    - Adjust expectations: Ensemble should be preserved when present.
    - Add a new test case: descriptive “Ensemble (cast …)” normalizes to `Ensemble`.
- Add a migration test in `app/src/state/DraftProvider.test.tsx`:
  - Hydrate with a saved state missing the `Ensemble` key and ensure provider injects it with empty roster and updates `suiteOrder` to include it.
- Run existing tests to validate no regressions in assignment and turn advancement.

8) Backward Compatibility & Data
- LocalStorage payloads saved before this change won’t contain `Ensemble` in `suites` or `suiteOrder`. The migration above preserves continuity.
- CSV mapping cache keys (Import screen) remain valid; no changes needed.

9) Rollout Order
1. Types/constants/colors + CSS theme rule.
2. CSV parsing: alias + remove Ensemble from ignorables.
3. DraftProvider hydration migration.
4. Import copy update.
5. Test updates/additions.
6. Manual sanity: import a CSV with Ensemble preferences; start draft; confirm Ensemble appears in turn order and in rosters/exports; finalize and export to verify.

10) Risks & Mitigations
- Risk: Old saved drafts missing `Ensemble` break rendering.
  - Mitigation: explicit hydration migration ensures presence of the suite.
- Risk: Theming falls back if no CSS rule exists for Ensemble.
  - Mitigation: add `suite-theme--ensemble` header rule aligned to its palette.
- Risk: CSV with only Ensemble preferences were previously skipped; now they are included and affect counts/order.
  - Mitigation: expected change; verify `computeSuiteOrder` behavior with sample data.

Acceptance Checklist
- Import preserves Ensemble preferences; no error thrown; preference compaction doesn’t drop Ensemble.
- Draft shows Ensemble in the turn order and allows picking/finalizing.
- Final Edits shows Ensemble column; drag and drop works.
- Export includes an Ensemble card and downloads a suite CSV for Ensemble.
- Resuming an older saved draft works and shows Ensemble with an empty roster if previously absent.

