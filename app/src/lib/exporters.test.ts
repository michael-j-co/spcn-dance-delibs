import { describe, expect, it } from 'vitest'
import { SUITE_NAMES } from '../constants'
import { createAllAssignmentsCsv, createSuiteCsv } from './exporters'
import type { DraftState } from '../types'

const createState = (): DraftState => {
  const suites = SUITE_NAMES.reduce<DraftState['suites']>(
    (acc, suite) => ({
      ...acc,
      [suite]: { ids: [], finalized: false },
    }),
    {} as DraftState['suites'],
  )

  const dancers = [
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
      assignedSuite: 'Maria Clara',
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
      assignedSuite: undefined,
    },
  ] as DraftState['dancers']

  suites['Maria Clara'].ids.push('1')

  return {
    dancers,
    unassignedIds: ['2'],
    suites,
    currentTurnSuiteIndex: 0,
    startedAt: new Date().toISOString(),
  }
}

describe('CSV exporters', () => {
  it('creates a CSV for all assignments', () => {
    const state = createState()
    const { filename, content } = createAllAssignmentsCsv(state)

    expect(filename).toBe('all_assignments.csv')
    const lines = content.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toMatch(/Alex Doe,Maria Clara/)
    expect(lines[2]).toMatch(/Jamie Lee,,Rural/)
  })

  it('creates suite-specific CSVs with expected naming', () => {
    const state = createState()
    const { filename, content } = createSuiteCsv(state, 'Maria Clara')

    expect(filename).toBe('suite_maria_clara.csv')
    expect(content.split('\n')).toHaveLength(2)
    expect(content).toMatch(/Alex Doe/)
  })
})
