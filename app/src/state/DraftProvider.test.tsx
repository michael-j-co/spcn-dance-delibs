import { render, waitFor, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { DraftProvider, useDraftStore } from './DraftProvider'
import type { Dancer, SuiteName } from '../types'

beforeEach(() => {
  window.localStorage.clear()
})

type DraftStoreSnapshot = ReturnType<typeof useDraftStore>

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

    expect(latest?.state?.dancers).toHaveLength(2)
    expect(latest?.state?.currentTurnSuiteIndex).toBe(0)

    act(() => {
      latest!.actions.assignToCurrentSuite([dancerA.id])
    })

    expect(latest?.state?.suites['Maria Clara'].ids).toContain('1')
    expect(latest?.state?.unassignedIds).toEqual(['2'])
    expect(latest?.state?.currentTurnSuiteIndex).toBe(1)

    act(() => {
      latest!.actions.finalizeSuite('Maria Clara')
    })

    expect(latest?.state?.suites['Maria Clara'].finalized).toBe(true)

    act(() => {
      latest!.actions.resetDraft()
    })

    expect(latest?.state).toBeNull()
  })
})
