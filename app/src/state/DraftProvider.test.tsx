import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { DraftProvider, useDraftStore, type DraftContextValue } from './DraftProvider'
import type { Dancer, SuiteName, DraftState } from '../types'

beforeEach(() => {
  window.localStorage.clear()
})

type DraftStoreSnapshot = DraftContextValue

function StoreObserver({
  onChange,
}: {
  onChange: (snapshot: DraftStoreSnapshot) => void
}) {
  const snapshot = useDraftStore()

  // Notify parent whenever the context value updates
  useEffect(() => {
    onChange(snapshot)
  }, [snapshot, onChange])

  return null
}

const createDancer = (id: string, name: string, prefs: SuiteName[]): Dancer => ({
  id,
  fullName: name,
  suitePrefs: {
    first: prefs[0],
    second: prefs[1],
    third: prefs[2],
  },
  roleScore: 5,
  isNew: true,
})

describe('DraftProvider', () => {
it('initialises drafts, assigns dancers, and advances turns', async () => {
    let latest: DraftStoreSnapshot | null = null

    render(
      <DraftProvider>
        <StoreObserver onChange={(snapshot) => (latest = snapshot)} />
      </DraftProvider>,
    )

    await waitFor(() => {
      expect(latest).not.toBeNull()
    })

    const dancerA = createDancer('1', 'Alex Doe', [
      'Maria Clara',
      'Rural',
      'Mindanao',
    ])
    const dancerB = createDancer('2', 'Jamie Lee', [
      'Rural',
      'Maria Clara',
      'Masa',
    ])

    act(() => {
      latest!.actions.initializeDraft([dancerA, dancerB])
    })

    await waitFor(() => {
      expect(latest?.state?.dancers).toHaveLength(2)
      expect(latest?.state?.currentTurnSuiteIndex).toBe(0)
    })

    const beforeIndex = latest!.state!.currentTurnSuiteIndex
    const currentSuiteBefore = latest!.state!.suiteOrder[beforeIndex]
    act(() => {
      latest!.actions.assignToCurrentSuite([dancerA.id])
    })

    await waitFor(() => {
      expect(latest?.state?.suites[currentSuiteBefore].ids).toContain('1')
      expect(latest?.state?.unassignedIds).toEqual(['2'])
      expect(latest?.state?.currentTurnSuiteIndex).not.toBe(beforeIndex)
    })

    act(() => {
      latest!.actions.finalizeSuite('Maria Clara')
    })

    await waitFor(() => {
      expect(latest?.state?.suites['Maria Clara'].finalized).toBe(true)
    })

    act(() => {
      latest!.actions.resetDraft()
    })

    await waitFor(() => {
      expect(latest?.state).toBeNull()
    })
  })

  it('hydrates and migrates missing suites (e.g., Ensemble)', async () => {
    let latest: DraftStoreSnapshot | null = null

    render(
      <DraftProvider>
        <StoreObserver onChange={(snapshot) => (latest = snapshot)} />
      </DraftProvider>,
    )

    await waitFor(() => {
      expect(latest).not.toBeNull()
    })

    const legacyState = {
      dancers: [],
      unassignedIds: [],
      suites: {
        'Maria Clara': { ids: [], finalized: false },
        Rural: { ids: [], finalized: false },
        Arnis: { ids: [], finalized: false },
        Mindanao: { ids: [], finalized: false },
        Masa: { ids: [], finalized: false },
        // Note: missing Ensemble on purpose
      },
      suiteOrder: ['Maria Clara', 'Rural', 'Arnis', 'Mindanao', 'Masa'],
      currentTurnSuiteIndex: 0,
      startedAt: new Date().toISOString(),
    }

    act(() => {
      // Cast through unknown to satisfy lint while simulating older payload shape
      latest!.actions.hydrate(legacyState as unknown as DraftState)
    })

    await waitFor(() => {
      expect(latest?.state?.suites['Ensemble']).toBeDefined()
      expect(latest?.state?.suites['Ensemble'].ids).toEqual([])
      expect(latest?.state?.suiteOrder).toContain('Ensemble')
    })
  })
})
