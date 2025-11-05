# Recommendation Simplification (Option B) — Implementation Plan

Goal: Rank candidates purely by how highly they prefer the current suite (1st > 2nd > 3rd > none). Replace the old numeric `score` with an explicit `prefRank` (1–4). Treat the first 10 as the recommended set.

## Summary of Changes
- Replace `ScoredDancer` with `RankedDancer` that includes `prefRank` instead of `score`.
- Update `buildRecommendations` to compute `prefRank` and sort by it (asc), then `fullName` (asc).
- Derive `topPicks` as the first 10 by this sort.
- Update all usages and tests to reference `prefRank` (and remove `.score` references).
- Keep unified table UX the same: recommended (first 10) still get a star and the “Select/Deselect Top” works on those IDs.

## Step-by-Step

1) Types — Add RankedDancer, deprecate ScoredDancer
- File: `app/src/types.ts`
  - Add: `export type RankedDancer = Dancer & { prefRank: 1 | 2 | 3 | 4 }`
  - (Optional) Keep `ScoredDancer` temporarily if you prefer a phased migration, but the plan removes it.
  - Update any type exports/imports accordingly.

2) Recommendations — compute and sort by prefRank
- File: `app/src/lib/recommendations.ts`
  - Remove `scoreForSuite` and add `prefRankForSuite(dancer, suite)` returning:
    - 1 if `dancer.suitePrefs.first === suite`
    - 2 if second, 3 if third, 4 otherwise
  - Build `allCandidates: RankedDancer[]` by mapping unassigned dancers to `{ ...dancer, prefRank }`.
  - Sort: `prefRank` ascending, then `fullName` ascending.
  - `topPicks = allCandidates.slice(0, MAX_RECOMMENDATIONS)`.
  - Update return type to `{ topPicks: RankedDancer[]; allCandidates: RankedDancer[] }`.

3) DraftBoard — ensure table uses new ordering
- File: `app/src/pages/DraftBoard.tsx`
  - Import type changes only if needed (it generally uses values, not the type directly).
  - Ensure the unified table respects the ordering from `recommendations.allCandidates`.
  - Keep recommended set as `new Set(topPicks.map(d => d.id))` for starring and for the Select/Deselect Top button.
  - If performing a local sort, use tie-breakers matching recommendations: `(isRecommended desc)`, then `(prefRank asc)`, then `(fullName asc)`.
  - Remove any remaining references to `.score` in comparator tie-breakers.

4) Tests — update to prefRank and new ordering
- File: `app/src/lib/recommendations.test.ts`
  - Replace `.score` assertions with `.prefRank`.
  - Expected order: all 1st-pref first (alpha), then 2nd-pref (alpha), then 3rd-pref (alpha), then none (alpha).
  - `topPicks` should be the first `MAX_RECOMMENDATIONS` by that sort.

5) Search and clean up
- Global grep for `ScoredDancer` and `.score` usage:
  - Update imports and types to `RankedDancer` and `.prefRank` (or remove usage).
  - Ensure no runtime comparator still relies on `.score`.

6) Docs
- Update PRD/docs to say: “Recommendations are ordered by preference rank (1st > 2nd > 3rd > none). The first 10 are shown as recommended.”
- Clarify that M/F score is for display only (color-coded) and does not influence recommendation ordering.

## Validation Checklist
- First 10 rows in the unified table are those with the highest preference for the active suite (1st-pref first; if fewer than 10, 2nd-pref rows follow, then 3rd, then none).
- Star and Select/Deselect Top align with the first 10 rows under the current filter.
- No crashes or type errors from removed `.score`.
- Tests pass with updated expectations.

## Rollback Plan
- Keep a local branch or stash of the current `ScoredDancer` implementation.
- If issues arise, revert recommendations.ts and test changes; DraftBoard will still function with existing behavior.
