import { describe, expect, it } from 'vitest'
import { buildRecommendations } from './recommendations'
import { SUITE_NAMES } from '../constants'
import type { DraftState } from '../types'

const createState = (): DraftState => {
  const suites = SUITE_NAMES.reduce<DraftState['suites']>(
    (acc, suite) => ({
      ...acc,
      [suite]: { ids: [], finalized: false },
    }),
    {} as DraftState['suites'],
  )

  return {
    dancers: [
      {
        id: '1',
        fullName: 'Alex Doe',
        suitePrefs: {
          first: 'Maria Clara',
          second: 'Rural',
          third: 'Mindanao',
        },
        roleScore: 8,
        isNew: true,
      },
      {
        id: '2',
        fullName: 'Jamie Lee',
        suitePrefs: {
          first: 'Rural',
          second: 'Maria Clara',
          third: 'Mindanao',
        },
        roleScore: 6,
        isNew: false,
      },
      {
        id: '3',
        fullName: 'Sam Park',
        suitePrefs: {
          first: 'Mindanao',
          second: 'Masa',
          third: 'Maria Clara',
        },
        roleScore: 4,
        isNew: true,
      },
    ],
    unassignedIds: ['1', '2', '3'],
    suites,
    currentTurnSuiteIndex: 0,
    startedAt: new Date().toISOString(),
  }
}

describe('buildRecommendations', () => {
  it('scores dancers relative to a suite and returns sorted lists', () => {
    const state = createState()
    const { topPicks, allCandidates } = buildRecommendations(
      state,
      'Maria Clara',
    )

    expect(topPicks).toHaveLength(3)
    expect(topPicks[0].id).toBe('1')
    expect(topPicks[0].score).toBe(10)
    expect(allCandidates.map((d) => d.id)).toEqual(['1', '2', '3'])
    expect(allCandidates[1].score).toBe(6)
    expect(allCandidates[2].score).toBe(4)
  })
})
