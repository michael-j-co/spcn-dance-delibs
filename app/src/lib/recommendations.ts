import { MAX_RECOMMENDATIONS } from '../constants'
import type { Dancer, DraftState, RankedDancer, SuiteName } from '../types'
import { shuffleWithSeed } from './random'

function prefRankForSuite(dancer: Dancer, suite: SuiteName): 1 | 2 | 3 | 4 {
  if (dancer.suitePrefs.first === suite) return 1
  if (dancer.suitePrefs.second === suite) return 2
  if (dancer.suitePrefs.third === suite) return 3
  return 4
}

export function buildRecommendations(
  state: DraftState,
  suite: SuiteName,
): { topPicks: RankedDancer[]; allCandidates: RankedDancer[] } {
  // Build ranked list and group by preference rank
  const ranked: RankedDancer[] = state.unassignedIds
    .map((id) => state.dancers.find((d) => d.id === id))
    .filter((dancer): dancer is Dancer => Boolean(dancer))
    .map((dancer) => ({ ...dancer, prefRank: prefRankForSuite(dancer, suite) }))

  // Group explicitly into arrays to avoid any runtime key coercion issues
  const rank1: RankedDancer[] = []
  const rank2: RankedDancer[] = []
  const rank3: RankedDancer[] = []
  const rank4: RankedDancer[] = []
  for (const d of ranked) {
    const r = Number((d as any).prefRank)
    if (r === 1) rank1.push(d)
    else if (r === 2) rank2.push(d)
    else if (r === 3) rank3.push(d)
    else rank4.push(d)
  }
  // Baseline: within-group deterministic alpha order
  const groups: Record<1 | 2 | 3 | 4, RankedDancer[]> = {
    1: rank1.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    2: rank2.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    3: rank3.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    4: rank4.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
  }

  // Deterministic seed per draft session + suite + set of unassigned IDs
  const seed = `${state.startedAt}::${suite}::${[...state.unassignedIds]
    .slice()
    .sort()
    .join(',')}`

  // Build top picks by concatenating ranks; if cutoff occurs within a group, shuffle that group
  const topPicks: RankedDancer[] = []
  let take = MAX_RECOMMENDATIONS
  let boundaryRank: 1 | 2 | 3 | 4 | undefined
  let shuffledBoundary: RankedDancer[] | undefined

  for (const rank of [1, 2, 3, 4] as const) {
    const group = groups[rank]
    if (take <= 0) break
    if (group.length <= take) {
      topPicks.push(...group)
      take -= group.length
    } else {
      boundaryRank = rank
      shuffledBoundary = shuffleWithSeed(group, seed)
      topPicks.push(...shuffledBoundary.slice(0, take))
      take = 0
      break
    }
  }

  // Build allCandidates preserving groups; use shuffled order for the boundary group if any
  const allCandidates: RankedDancer[] = []
  for (const rank of [1, 2, 3, 4] as const) {
    if (boundaryRank === rank && shuffledBoundary) {
      allCandidates.push(...shuffledBoundary)
    } else {
      allCandidates.push(...groups[rank])
    }
  }

  return { topPicks, allCandidates }
}
