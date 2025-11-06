import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SUITE_NAMES } from '../constants'
import {
  type Dancer,
  type DraftAction,
  type DraftState,
  type SuiteName,
} from '../types'
import {
  clearDraftState,
  loadDraftState,
  saveDraftState,
} from '../lib/storage'

export type DraftContextValue = {
  state: DraftState | null
  actions: {
    initializeDraft: (dancers: Dancer[]) => void
    assignToCurrentSuite: (dancerIds: string[]) => void
    manualAssign: (dancerId: string, suite: SuiteName) => void
    moveDancer: (dancerId: string, to?: SuiteName) => void
    unassignDancer: (dancerId: string) => void
    finalizeSuite: (suite: SuiteName) => void
    advanceTurn: () => void
    resetDraft: () => void
    hydrate: (state: DraftState) => void
  }
  helpers: {
    currentSuite: SuiteName | null
    hasSavedDraft: boolean
    refreshSavedDraftFlag: () => void
  }
}

const DraftContext = createContext<DraftContextValue | undefined>(undefined)

const initialState: DraftState | null = null

function computeSuiteOrder(dancers: Dancer[]): SuiteName[] {
  const firstPrefCounts = new Map<SuiteName, number>()
  SUITE_NAMES.forEach((s) => firstPrefCounts.set(s, 0))
  for (const d of dancers) {
    const pref = d.suitePrefs.first
    if (pref && firstPrefCounts.has(pref)) {
      firstPrefCounts.set(pref, (firstPrefCounts.get(pref) || 0) + 1)
    }
  }
  return [...SUITE_NAMES].sort((a, b) => {
    const ca = firstPrefCounts.get(a) ?? 0
    const cb = firstPrefCounts.get(b) ?? 0
    if (ca !== cb) return ca - cb
    return SUITE_NAMES.indexOf(a) - SUITE_NAMES.indexOf(b)
  })
}

function buildInitialState(dancers: Dancer[]): DraftState {
  const cleanedDancers = dancers.map((dancer) => ({
    ...dancer,
    assignedSuite: undefined,
  }))

  const suites = SUITE_NAMES.reduce<DraftState['suites']>(
    (acc, suite) => ({
      ...acc,
      [suite]: { ids: [], finalized: false },
    }),
    {} as DraftState['suites'],
  )

  const suiteOrder = computeSuiteOrder(cleanedDancers)

  return {
    dancers: cleanedDancers,
    unassignedIds: cleanedDancers.map((dancer) => dancer.id),
    suites,
    suiteOrder,
    currentTurnSuiteIndex: 0,
    startedAt: new Date().toISOString(),
  }
}

function getNextActiveSuiteIndex(state: DraftState, startIndex: number): number {
  const order = state.suiteOrder
  for (let i = 0; i < order.length; i += 1) {
    const idx = (startIndex + i) % order.length
    const suite = order[idx]
    if (!state.suites[suite].finalized) {
      return idx
    }
  }
  return state.currentTurnSuiteIndex
}

function draftReducer(state: DraftState | null, action: DraftAction) {
  switch (action.type) {
    case 'INITIALIZE': {
      return buildInitialState(action.payload.dancers)
    }
    case 'HYDRATE': {
      const s = action.payload.state

      // Migration: ensure all suites exist (e.g., newly added Ensemble)
      const migratedSuites = { ...s.suites }
      for (const suite of SUITE_NAMES) {
        if (!migratedSuites[suite]) {
          migratedSuites[suite] = { ids: [], finalized: false }
        }
      }

      // Establish base order; if missing/empty, compute from dancers
      const baseOrder = s.suiteOrder && s.suiteOrder.length
        ? s.suiteOrder.slice()
        : computeSuiteOrder(s.dancers)
      // Append any newly introduced suites that are missing from the order
      const missing = SUITE_NAMES.filter((name) => !baseOrder.includes(name))
      const order = [...baseOrder, ...missing]

      // Clamp currentTurnSuiteIndex within bounds
      const currentTurnSuiteIndex = Math.min(
        Math.max(0, s.currentTurnSuiteIndex ?? 0),
        Math.max(0, order.length - 1),
      )

      return { ...s, suites: migratedSuites, suiteOrder: order, currentTurnSuiteIndex }
    }
    case 'RESET': {
      return initialState
    }
    default: {
      if (!state) return state
      switch (action.type) {
        case 'ASSIGN_DANCERS': {
          const { suite, dancerIds } = action.payload
          if (!dancerIds.length) {
            return state
          }

          const uniqueIds = [...new Set(dancerIds)]
          const updatedDancers = state.dancers.map((dancer) =>
            uniqueIds.includes(dancer.id)
              ? { ...dancer, assignedSuite: suite }
              : dancer,
          )

          const updatedSuites = {
            ...state.suites,
            [suite]: {
              ...state.suites[suite],
              ids: [...state.suites[suite].ids, ...uniqueIds],
            },
          }

          const updatedUnassigned = state.unassignedIds.filter(
            (id) => !uniqueIds.includes(id),
          )

          return {
            ...state,
            dancers: updatedDancers,
            suites: updatedSuites,
            unassignedIds: updatedUnassigned,
          }
        }
        case 'ADVANCE_TURN': {
          if (!state) return state
          const nextIndex = getNextActiveSuiteIndex(
            state,
            state.currentTurnSuiteIndex + 1,
          )
          return {
            ...state,
            currentTurnSuiteIndex: nextIndex,
          }
        }
        case 'MOVE_DANCER': {
          const { dancerId, to } = action.payload
          const dancer = state.dancers.find((d) => d.id === dancerId)
          if (!dancer) return state

          const from = dancer.assignedSuite

          // No-op if moving to same suite
          if (from && to === from) return state

          // Update dancers list
          const updatedDancers = state.dancers.map((d) =>
            d.id === dancerId ? { ...d, assignedSuite: to } : d,
          )

          // Update suites roster ids: remove from previous, add to destination
          const updatedSuites = { ...state.suites }
          if (from) {
            updatedSuites[from] = {
              ...updatedSuites[from],
              ids: updatedSuites[from].ids.filter((id) => id !== dancerId),
            }
          }
          if (to) {
            const set = new Set(updatedSuites[to].ids)
            set.add(dancerId)
            updatedSuites[to] = { ...updatedSuites[to], ids: [...set] }
          }

          // Update unassignedIds
          const unassignedSet = new Set(state.unassignedIds)
          if (to) {
            unassignedSet.delete(dancerId)
          } else {
            unassignedSet.add(dancerId)
          }

          return {
            ...state,
            dancers: updatedDancers,
            suites: updatedSuites,
            unassignedIds: [...unassignedSet],
          }
        }
        case 'UNASSIGN_DANCER': {
          const { dancerId } = action.payload
          const dancer = state.dancers.find((d) => d.id === dancerId)
          if (!dancer) return state

          const from = dancer.assignedSuite

          // Update dancers
          const updatedDancers = state.dancers.map((d) =>
            d.id === dancerId ? { ...d, assignedSuite: undefined } : d,
          )

          // Remove from source roster
          const updatedSuites = { ...state.suites }
          if (from) {
            updatedSuites[from] = {
              ...updatedSuites[from],
              ids: updatedSuites[from].ids.filter((id) => id !== dancerId),
            }
          }

          // Ensure in unassigned
          const unassignedSet = new Set(state.unassignedIds)
          unassignedSet.add(dancerId)

          return {
            ...state,
            dancers: updatedDancers,
            suites: updatedSuites,
            unassignedIds: [...unassignedSet],
          }
        }
        case 'FINALIZE_SUITE': {
          const { suite } = action.payload
          const updatedSuites = {
            ...state.suites,
            [suite]: { ...state.suites[suite], finalized: true },
          }

          const updatedState = {
            ...state,
            suites: updatedSuites,
          }

          const currentSuite = state.suiteOrder[state.currentTurnSuiteIndex]
          if (currentSuite === suite) {
            const nextIndex = getNextActiveSuiteIndex(
              updatedState,
              state.currentTurnSuiteIndex + 1,
            )
            return {
              ...updatedState,
              currentTurnSuiteIndex: nextIndex,
            }
          }

          return updatedState
        }
        default:
          return state
      }
    }
  }
}

type DraftProviderProps = {
  children: ReactNode
}

export function DraftProvider({ children }: DraftProviderProps) {
  const [state, dispatch] = useReducer(draftReducer, initialState)
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return Boolean(loadDraftState())
  })
  const isHydratingRef = useRef(false)

  const saveState = useCallback(
    (nextState: DraftState | null) => {
      if (!nextState) {
        clearDraftState()
        setHasSavedDraft(false)
        return
      }
      saveDraftState({
        state: nextState,
        savedAt: new Date().toISOString(),
      })
      setHasSavedDraft(true)
    },
    [],
  )

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false
      return
    }
    if (state) {
      saveState(state)
    } else {
      clearDraftState()
      setHasSavedDraft(false)
    }
  }, [saveState, state])

  const initializeDraft = useCallback((dancers: Dancer[]) => {
    dispatch({ type: 'INITIALIZE', payload: { dancers } })
  }, [])

  const assignToCurrentSuite = useCallback(
    (dancerIds: string[]) => {
      if (!state) return
      const suite = state.suiteOrder[state.currentTurnSuiteIndex]
      if (!suite || state.suites[suite]?.finalized) {
        dispatch({ type: 'ADVANCE_TURN' })
        return
      }
      dispatch({
        type: 'ASSIGN_DANCERS',
        payload: { suite, dancerIds },
      })
      dispatch({ type: 'ADVANCE_TURN' })
    },
    [state],
  )

  const manualAssign = useCallback(
    (dancerId: string, suite: SuiteName) => {
      if (!state || !state.unassignedIds.includes(dancerId)) return
      dispatch({
        type: 'ASSIGN_DANCERS',
        payload: { suite, dancerIds: [dancerId] },
      })
    },
    [state],
  )

  const finalizeSuite = useCallback((suite: SuiteName) => {
    dispatch({ type: 'FINALIZE_SUITE', payload: { suite } })
  }, [])

  const moveDancer = useCallback((dancerId: string, to?: SuiteName) => {
    dispatch({ type: 'MOVE_DANCER', payload: { dancerId, to } })
  }, [])

  const unassignDancer = useCallback((dancerId: string) => {
    dispatch({ type: 'UNASSIGN_DANCER', payload: { dancerId } })
  }, [])

  const advanceTurn = useCallback(() => {
    dispatch({ type: 'ADVANCE_TURN' })
  }, [])

  const resetDraft = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const hydrate = useCallback((draft: DraftState) => {
    isHydratingRef.current = true
    dispatch({ type: 'HYDRATE', payload: { state: draft } })
  }, [])

  const currentSuite = useMemo(() => {
    if (!state) return null
    const hasActiveSuite = state.suiteOrder.some(
      (suite) => !state.suites[suite].finalized,
    )
    if (!hasActiveSuite) {
      return null
    }
    const suiteAtIndex = state.suiteOrder[state.currentTurnSuiteIndex]
    if (!suiteAtIndex) return null
    if (state.suites[suiteAtIndex]?.finalized) {
      const nextAvailable = state.suiteOrder.find(
        (suite) => !state.suites[suite].finalized,
      )
      return nextAvailable ?? null
    }
    return suiteAtIndex
  }, [state])

  const refreshSavedDraftFlag = useCallback(() => {
    setHasSavedDraft(Boolean(loadDraftState()))
  }, [])

  const value = useMemo<DraftContextValue>(
    () => ({
      state,
      actions: {
        initializeDraft,
        assignToCurrentSuite,
        manualAssign,
        moveDancer,
        unassignDancer,
        finalizeSuite,
        advanceTurn,
        resetDraft,
        hydrate,
      },
      helpers: {
        currentSuite,
        hasSavedDraft,
        refreshSavedDraftFlag,
      },
    }),
    [
      advanceTurn,
      assignToCurrentSuite,
      currentSuite,
      finalizeSuite,
      hasSavedDraft,
      hydrate,
      initializeDraft,
      manualAssign,
      refreshSavedDraftFlag,
      resetDraft,
      state,
    ],
  )

  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  )
}

export function useDraftStore() {
  const context = useContext(DraftContext)
  if (!context) {
    throw new Error('useDraftStore must be used within DraftProvider')
  }
  return context
}
