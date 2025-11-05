import { MAX_RECOMMENDATIONS } from '../constants'
import type { Dancer, DraftState, ScoredDancer, SuiteName } from '../types'

function scoreForSuite(dancer: Dancer, suite: SuiteName): number {
  if (dancer.suitePrefs.first === suite) return 10
  if (dancer.suitePrefs.second === suite) return 6
  if (dancer.suitePrefs.third === suite) return 4
  return 1
}

export function buildRecommendations(
  state: DraftState,
  suite: SuiteName,
): { topPicks: ScoredDancer[]; allCandidates: ScoredDancer[] } {
  const allCandidates: ScoredDancer[] = state.unassignedIds
    .map((id) => state.dancers.find((d) => d.id === id))
    .filter((dancer): dancer is ScoredDancer => Boolean(dancer))
    .map((dancer) => ({
      ...dancer,
      score: scoreForSuite(dancer, suite),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.fullName.localeCompare(b.fullName)
    })

  const topPicks = allCandidates.slice(0, MAX_RECOMMENDATIONS)

  return { topPicks, allCandidates }
}
