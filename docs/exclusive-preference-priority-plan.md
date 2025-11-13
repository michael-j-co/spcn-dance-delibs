# Exclusive Preference Priority Plan

## Goal
Ensure dancers who list the current suite as their only preference (e.g., `Arnis / - / -`) appear before dancers who also listed backup suites when viewing the Draft Board. This priority should be applied consistently wherever recommendations are surfaced so these "exclusive" candidates are always surfaced first within their preference tier.

## Definitions
- **Exclusive preference**: `suitePrefs.first` matches the suite being drafted and both `suitePrefs.second` and `suitePrefs.third` are `null`.
- **General preference**: any other configuration (additional suites listed or the suite is not their first choice).

## Implementation Steps
1. **Introduce an exclusivity helper**
   - In `app/src/lib/recommendations.ts`, add a small helper (e.g., `isExclusiveForSuite`) that checks whether a dancer only listed the target suite.
   - Optionally expose a numeric `preferenceSpecificity` (count of non-null prefs) to make future tie‑breakers easier.

2. **Prioritize exclusives inside `buildRecommendations`**
   - When building the rank groups (currently sorted alphabetically), split each group by exclusivity *after* the `prefRank` is known.
   - Sort each subset alphabetically so results stay deterministic.
   - Reconstruct each group by concatenating `exclusive` subset first, then `general`.

3. **Preserve priority when shuffling boundary groups**
   - Today, if the recommendation cut-off happens mid-group, that group is shuffled with `shuffleWithSeed`.
   - Update this logic so shuffling occurs within each subset (`exclusive`, `general`) independently, then concatenate—this keeps exclusives ahead of non-exclusives even when randomness is required for fairness.
   - Ensure the same ordering is reused when concatenating `allCandidates` so the Draft Board’s full list mirrors the top-picks ordering.

4. **Add regression tests**
   - Extend `app/src/lib/recommendations.test.ts` with a scenario where multiple dancers share the same first preference but differ in how many suites they listed.
   - Assert that `buildRecommendations` places the exclusive dancer(s) before the others, both in `topPicks` and `allCandidates`, even when the group is partially truncated to trigger the shuffle path.
   - Keep existing assertions intact to guard against regressions in pref-rank ordering and deterministic behavior.

5. **Manual verification checklist**
   - Import sample data with known exclusive vs. non-exclusive cases.
   - Confirm on `DraftBoard` that exclusive dancers now render above others within the same preference tier and that selection flows remain unchanged.

