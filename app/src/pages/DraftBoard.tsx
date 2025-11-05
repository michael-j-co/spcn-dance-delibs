import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { MAX_PICKS_PER_TURN, SUITE_NAMES } from '../constants'
import { buildRecommendations } from '../lib/recommendations'
import type { Dancer, DraftState, SuiteName } from '../types'
import { useDraftStore } from '../state/DraftProvider'

type DraftBoardProps = {
  onNavigateToExport: () => void
}

export function DraftBoard({ onNavigateToExport }: DraftBoardProps) {
  const { state, actions, helpers } = useDraftStore()

  if (!state) {
    return (
      <section className="panel">
        <div className="panel__body">
          <p>Import dancer data to begin drafting.</p>
        </div>
      </section>
    )
  }

  const currentSuite = helpers.currentSuite
  const dancerLookup = useMemo(() => {
    const map = new Map<string, Dancer>()
    state.dancers.forEach((dancer) => {
      map.set(dancer.id, dancer)
    })
    return map
  }, [state.dancers])

  const allFinalized = SUITE_NAMES.every(
    (suite) => state.suites[suite].finalized,
  )

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [manualAssignOpen, setManualAssignOpen] = useState(false)

  useEffect(() => {
    setSelectedIds([])
    setSearchTerm('')
  }, [currentSuite])

  const recommendations = useMemo(() => {
    if (!state || !currentSuite) {
      return { topPicks: [], allCandidates: [] }
    }
    return buildRecommendations(state, currentSuite)
  }, [currentSuite, state])

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return recommendations.allCandidates
    return recommendations.allCandidates.filter((candidate) =>
      candidate.fullName.toLowerCase().includes(term),
    )
  }, [recommendations.allCandidates, searchTerm])

  const unassignedDancers = useMemo(
      () =>
        state.unassignedIds
          .map((id) => dancerLookup.get(id))
          .filter((dancer): dancer is Dancer => Boolean(dancer)),
    [dancerLookup, state.unassignedIds],
  )

  const defaultManualSuite = useMemo(() => {
    const firstActive = SUITE_NAMES.find(
      (suite) => !state.suites[suite].finalized,
    )
    return firstActive ?? SUITE_NAMES[0]
  }, [state.suites])

  const handleToggleSelection = (dancerId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(dancerId)) {
        return prev.filter((id) => id !== dancerId)
      }
      if (prev.length >= MAX_PICKS_PER_TURN) {
        return prev
      }
      return [...prev, dancerId]
    })
  }

  const handleConfirmPicks = () => {
    actions.assignToCurrentSuite(selectedIds)
    setSelectedIds([])
  }

  const handleFinalizeSuite = () => {
    if (!currentSuite) return
    actions.finalizeSuite(currentSuite)
  }

  const currentRoster = currentSuite
    ? state.suites[currentSuite]
    : { ids: [], finalized: false }

  const selectedCount = selectedIds.length
  const confirmDisabled =
    !currentSuite || selectedCount > MAX_PICKS_PER_TURN

  return (
    <div className="draft-layout">
      <section className="panel draft-panel">
        <header className="panel__header">
          <div>
            <h2>{currentSuite ?? 'All Suites Finalized'}</h2>
            <p>
              Unassigned dancers remaining: {state.unassignedIds.length}
            </p>
          </div>
          <div className="panel__header-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setManualAssignOpen(true)}
              disabled={!state.unassignedIds.length}
            >
              Manual Assign
            </button>
            <button type="button" className="secondary" onClick={onNavigateToExport}>
              Export Rosters
            </button>
          </div>
        </header>

        {allFinalized && (
          <div className="panel__body info">
            <p>
              All suites are finalized. You can still manually assign any
              remaining dancers or proceed to export rosters.
            </p>
          </div>
        )}

        {!allFinalized && currentSuite && (
          <>
            <div className="panel__body">
              <h3>Recommended Picks</h3>
              {recommendations.topPicks.length === 0 ? (
                <p>No recommendations available.</p>
              ) : (
                <ul className="dancer-list">
                  {recommendations.topPicks.map((dancer) => (
                    <li key={dancer.id}>
                      <label className="dancer-select">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(dancer.id)}
                          onChange={() => handleToggleSelection(dancer.id)}
                        />
                        <span>
                          <strong>{dancer.fullName}</strong>
                          <small>
                            Score {dancer.score} • Role {dancer.roleScore} •{' '}
                            {dancer.isNew ? 'New' : 'Returning'}
                          </small>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel__body">
              <div className="eligible-header">
                <h3>All Eligible Dancers</h3>
                <input
                  type="search"
                  placeholder="Search by name"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              {filteredCandidates.length === 0 ? (
                <p>No dancers match the current filters.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Role</th>
                        <th>New?</th>
                        <th>Preferences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((candidate) => (
                        <tr key={candidate.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(candidate.id)}
                              onChange={() =>
                                handleToggleSelection(candidate.id)
                              }
                              disabled={
                                !selectedIds.includes(candidate.id) &&
                                selectedIds.length >= MAX_PICKS_PER_TURN
                              }
                            />
                          </td>
                          <td>{candidate.fullName}</td>
                          <td>{candidate.score}</td>
                          <td>{candidate.roleScore}</td>
                          <td>{candidate.isNew ? 'Yes' : 'No'}</td>
                          <td>
                            {candidate.suitePrefs.first ?? '—'} ›{' '}
                            {candidate.suitePrefs.second ?? '—'} ›{' '}
                            {candidate.suitePrefs.third ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <footer className="panel__footer">
              <div>
                <strong>Selected:</strong> {selectedCount}/
                {MAX_PICKS_PER_TURN}
              </div>
              <div className="panel__footer-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                >
                  Clear Picks
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleFinalizeSuite}
                  disabled={currentRoster.finalized}
                >
                  Finalize {currentSuite} Roster
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPicks}
                  disabled={confirmDisabled}
                >
                  Confirm Picks
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <aside className="roster-panel">
        <h2>Suite Rosters</h2>
        <div className="roster-list">
          {SUITE_NAMES.map((suite) => (
            <SuiteRosterCard
              key={suite}
              suite={suite}
              rosterIds={state.suites[suite].ids}
              finalized={state.suites[suite].finalized}
              dancers={dancerLookup}
              isCurrent={suite === currentSuite}
            />
          ))}
        </div>
      </aside>

      {manualAssignOpen && (
        <ManualAssignModal
          dancers={unassignedDancers}
          defaultSuite={defaultManualSuite}
          suiteStatuses={state.suites}
          onClose={() => setManualAssignOpen(false)}
          onSubmit={(payload) => {
            actions.manualAssign(payload.dancerId, payload.suite)
          }}
        />
      )}
    </div>
  )
}

type SuiteRosterCardProps = {
  suite: SuiteName
  rosterIds: string[]
  dancers: Map<string, Dancer>
  finalized: boolean
  isCurrent: boolean
}

function SuiteRosterCard({
  suite,
  rosterIds,
  dancers,
  finalized,
  isCurrent,
}: SuiteRosterCardProps) {
  const rosterDancers = rosterIds
    .map((id) => dancers.get(id))
    .filter((dancer): dancer is Dancer => Boolean(dancer))

  const newCount = rosterDancers.filter((dancer) => dancer.isNew).length
  const returningCount = rosterDancers.length - newCount
  const averageRoleScore =
    rosterDancers.reduce((sum, dancer) => sum + dancer.roleScore, 0) /
    (rosterDancers.length || 1)

  return (
    <div className={`suite-card ${isCurrent ? 'is-current' : ''}`}>
      <header>
        <h3>{suite}</h3>
        {finalized && <span className="badge">Finalized</span>}
      </header>
      <div className="suite-card__summary">
        <span>
          <strong>{rosterDancers.length}</strong> dancers
        </span>
        <span>
          <strong>{newCount}</strong> new / {returningCount} returning
        </span>
        <span>Avg role score {averageRoleScore.toFixed(1)}</span>
      </div>
      {rosterDancers.length > 0 ? (
        <ul>
          {rosterDancers.map((dancer) => (
            <li key={dancer.id}>
              <strong>{dancer.fullName}</strong>
              <small>
                Role {dancer.roleScore} • Prefs:{' '}
                {dancer.suitePrefs.first ?? '—'} /
                {dancer.suitePrefs.second ?? '—'} /
                {dancer.suitePrefs.third ?? '—'}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No dancers assigned yet.</p>
      )}
    </div>
  )
}

type ManualAssignPayload = {
  dancerId: string
  suite: SuiteName
}

type ManualAssignModalProps = {
  dancers: Dancer[]
  defaultSuite: SuiteName
  suiteStatuses: DraftState['suites']
  onSubmit: (payload: ManualAssignPayload) => void
  onClose: () => void
}

function ManualAssignModal({
  dancers,
  defaultSuite,
  suiteStatuses,
  onSubmit,
  onClose,
}: ManualAssignModalProps) {
  const sortedDancers = useMemo(
    () => [...dancers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [dancers],
  )
  const [selectedDancer, setSelectedDancer] = useState<string>(
    sortedDancers[0]?.id ?? '',
  )
  const activeSuites = useMemo(
    () =>
      SUITE_NAMES.map((suite) => ({
        suite,
        finalized: suiteStatuses[suite]?.finalized ?? false,
      })),
    [suiteStatuses],
  )

  const allowFinalizedAssignments = useMemo(
    () => activeSuites.every((item) => item.finalized),
    [activeSuites],
  )

  const [suite, setSuite] = useState<SuiteName>(defaultSuite)

  useEffect(() => {
    if (sortedDancers.length > 0 && !selectedDancer) {
      setSelectedDancer(sortedDancers[0].id)
    }
  }, [selectedDancer, sortedDancers])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedDancer) return
    onSubmit({ dancerId: selectedDancer, suite })
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Manual Assignment</h2>
        {sortedDancers.length === 0 ? (
          <p>No unassigned dancers available.</p>
        ) : (
          <form onSubmit={handleSubmit} className="manual-form">
            <label>
              Dancer
              <select
                value={selectedDancer}
                onChange={(event) => setSelectedDancer(event.target.value)}
              >
                {sortedDancers.map((dancer) => (
                  <option key={dancer.id} value={dancer.id}>
                    {dancer.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Suite
              <select
                value={suite}
                onChange={(event) => setSuite(event.target.value as SuiteName)}
              >
                {activeSuites.map(({ suite, finalized }) => (
                  <option
                    key={suite}
                    value={suite}
                    disabled={finalized && !allowFinalizedAssignments}
                  >
                    {suite}
                    {finalized ? ' (finalized)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <footer className="modal__actions">
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit">Assign Dancer</button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
