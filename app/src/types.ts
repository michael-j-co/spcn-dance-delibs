export type SuiteName = 'Maria Clara' | 'Rural' | 'Arnis' | 'Mindanao' | 'Masa'

export type SuitePreferences = {
  first: SuiteName | null
  second: SuiteName | null
  third: SuiteName | null
}

export type Dancer = {
  id: string
  fullName: string
  suitePrefs: SuitePreferences
  roleScore: number
  isNew: boolean
  assignedSuite?: SuiteName
}

export type RankedDancer = Dancer & {
  prefRank: 1 | 2 | 3 | 4
}

export type SuiteRoster = {
  ids: string[]
  finalized: boolean
}

export type DraftState = {
  dancers: Dancer[]
  unassignedIds: string[]
  suites: Record<SuiteName, SuiteRoster>
  suiteOrder: SuiteName[]
  currentTurnSuiteIndex: number
  startedAt: string
}

export type DraftPersistedState = {
  state: DraftState
  savedAt: string
}

export type DraftAction =
  | { type: 'INITIALIZE'; payload: { dancers: Dancer[] } }
  | { type: 'HYDRATE'; payload: { state: DraftState } }
  | {
      type: 'ASSIGN_DANCERS'
      payload: { suite: SuiteName; dancerIds: string[] }
    }
  | { type: 'ADVANCE_TURN' }
  | { type: 'FINALIZE_SUITE'; payload: { suite: SuiteName } }
  | { type: 'RESET' }
  | {
      type: 'MOVE_DANCER'
      payload: { dancerId: string; to?: SuiteName }
    }
  | {
      type: 'UNASSIGN_DANCER'
      payload: { dancerId: string }
    }
