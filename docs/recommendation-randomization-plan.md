# Recommendation Randomization — Implementation Plan

Goal: When more than 10 equally viable candidates exist (same preference rank for the active suite), randomize the ordering among that equally viable set to avoid alphabetical bias. If the best group (highest preference rank) has ≤ 10, do not randomize.

Key principles
- Preference-first ordering remains: 1st-pref group first, then 2nd, then 3rd, then none.
- Randomize only within the preference-rank group where the Top 10 cutoff occurs (the “boundary group”).
- Deterministic randomness: use a stable seed so the order doesn’t flicker on re-render.
- Preserve current UX: the unified table shows recommended first; the first 10 rows are starred and used by the “Select/Deselect Top” button.

## Changes Overview
1) Add a deterministic shuffle utility (`shuffleWithSeed`).
2) Update `buildRecommendations` to:
   - Group candidates by `prefRank` (1..4).
   - Build `topPicks` by concatenating groups in order; if the cutoff falls within a group, shuffle that group deterministically and take the needed number.
   - Produce `allCandidates` with the same shuffled order for the boundary group (so the UI table ordering matches).
3) Update `DraftBoard` to respect the new ordering fully:
   - Do not re-sort inside the UI; instead derive `sortedCandidates` as `topPicks + (allCandidates \ topPicks)` so the randomized order is preserved.
4) Add tests with a fixed seed; update docs.

## Step-by-Step

1) Deterministic shuffle utility
- File: `app/src/lib/random.ts` (new)
  - Export `hashStringToSeed(str: string): number` (simple 32-bit hash).
  - Export `mulberry32(seed: number): () => number` RNG.
  - Export `shuffleWithSeed<T>(arr: T[], seed: string | number): T[]`
    - Copy array, shuffle with Fisher–Yates using RNG from `mulberry32` seeded with `hashStringToSeed(String(seed))`.

2) Update recommendations builder
- File: `app/src/lib/recommendations.ts`
  - Inputs: `state: DraftState`, `suite: SuiteName`.
  - Build `RankedDancer[]` with `prefRank` (already done in the simplification).
  - Group by `prefRank` (1..4), keeping initial name-asc order as a base.
  - Choose a stable seed, e.g.: `const seed = `${state.startedAt}::${suite}::${state.unassignedIds.sort().join(',')}``
    - Sorting IDs ensures stability independent of current array order.
  - Construct `topPicks`:
    - Let `take = MAX_PICKS_PER_TURN`.
    - For rank in [1, 2, 3, 4]:
      - If `group.length <= take`: append entire group to `topPicks`, `take -= group.length`.
      - Else (boundary group): shuffle group with `shuffleWithSeed(group, seed)`; append the first `take`; break.
  - Construct `allCandidates` for UI ordering:
    - For ranks before boundary: append groups untouched (still name-asc baseline).
    - For the boundary rank: append the entire shuffled group (the same order used to pick the top `take`), followed by remaining ranks in name-asc.
  - Return `{ topPicks, allCandidates }`.

3) Update DraftBoard table ordering
- File: `app/src/pages/DraftBoard.tsx`
  - Remove/replace any local sorting that reorders within recommended groups.
  - Implement `sortedCandidates` as:
    - `const topIds = new Set(topPicks.map(d => d.id))`
    - `const remainder = allCandidates.filter(d => !topIds.has(d.id))`
    - `const sortedCandidates = [...topPicks, ...remainder]`
  - Keep the star on names that are in `topIds`.
  - Keep the “Select/Deselect Top” behavior sourced from `topPicks`.

4) Tests
- File: `app/src/lib/recommendations.test.ts`
  - Add a case where > 10 candidates have `prefRank === 1` for the chosen suite.
  - Fix `state.startedAt` and the `unassignedIds` to a known deterministic signature.
  - Assert:
    - `topPicks` contain 10 IDs from the rank-1 group.
    - The order of those 10 matches the deterministic shuffle for the chosen seed (one exact ordering assertion is fine).
    - `allCandidates` begins with the same 10, followed by the rest of the shuffled boundary group, then rank-2, rank-3, rank-4 groups.
  - Keep/adjust prior tests to ensure when rank-1 group has ≤ 10, no shuffling occurs and alphabetical is preserved.

5) Docs
- Update `docs/recommendation-simplification-plan.md` (or add a short note) to mention randomization at the boundary group.
- Clarify that randomness is deterministic per draft session and suite.

## Validation Checklist
- With > 10 rank-1 candidates, the first 10 rows are that group in deterministic shuffled order.
- With ≤ 10 rank-1 candidates, ordering is unchanged (no randomization), and if the cutoff occurs in rank-2 or rank-3, only that boundary group is shuffled to fill to 10 (optional extension if desired).
- Star and “Select/Deselect Top” reflect the first 10 after shuffling.
- Reloading the page keeps the same order for the same draft state (seeded determinism).

## Optional Extension (boundary beyond rank-1)
- If rank-1 < 10 but rank-2 overflows the cutoff, apply the same shuffling logic to rank-2 for the needed slots, and use that full shuffled order for rank-2 in `allCandidates`.
- Repeat similarly if cutoff falls into rank-3.

## Rollback
- Keep the previous non-shuffled preference-rank sort behind a feature flag or a small guard; revert by removing `shuffleWithSeed` usage and boundary logic.
