import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { MAX_PICKS_PER_TURN } from '../constants'
import { buildRecommendations } from '../lib/recommendations'
import type { Dancer, SuiteName } from '../types'
import { useDraftStore } from '../state/DraftProvider'
import { SuiteChip } from '../components/SuiteChip'
import { Badge, Table, Stack } from '@chakra-ui/react'
import { formatSuiteName, getSuiteColor } from '../lib/colors'
import { FaArrowRight } from 'react-icons/fa'
import { RoleScore } from '../components/RoleScore'

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

  const rosterOrder = useMemo(() => {
    if (!currentSuite) return [...state.suiteOrder]
    return [
      currentSuite,
      ...state.suiteOrder.filter((suite) => suite !== currentSuite),
    ]
  }, [currentSuite, state.suiteOrder])

  const allFinalized = state.suiteOrder.every(
    (suite) => state.suites[suite].finalized,
  )

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  // Removed manual assign flow

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

  const recommendedSet = useMemo(
    () => new Set(recommendations.topPicks.map((d) => d.id)),
    [recommendations.topPicks],
  )

  const sortedCandidates = useMemo(() => {
    if (!filteredCandidates.length) return filteredCandidates
    const filteredIds = new Set(filteredCandidates.map((c) => c.id))
    const topFiltered = recommendations.topPicks.filter((d) => filteredIds.has(d.id))
    const topIds = new Set(topFiltered.map((d) => d.id))
    const remainder = recommendations.allCandidates.filter(
      (d) => filteredIds.has(d.id) && !topIds.has(d.id),
    )
    return [...topFiltered, ...remainder]
  }, [filteredCandidates, recommendations.allCandidates, recommendations.topPicks])


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
    const count = selectedIds.length
    if (count < MAX_PICKS_PER_TURN) {
      const proceed = window.confirm(
        `You've only picked ${count}/${MAX_PICKS_PER_TURN} people. Continue?`,
      )
      if (!proceed) return
    }
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

  const topRecommendationIds = useMemo(
    () =>
      recommendations.topPicks
        .slice(0, MAX_PICKS_PER_TURN)
        .map((dancer) => dancer.id),
    [recommendations.topPicks],
  )

  const areTopPicksSelected =
    topRecommendationIds.length > 0 &&
    topRecommendationIds.every((id) => selectedIds.includes(id))

  const handleToggleTopRecommendations = () => {
    if (areTopPicksSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !topRecommendationIds.includes(id)),
      )
      return
    }
    setSelectedIds(topRecommendationIds)
  }

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
          {!allFinalized && currentSuite && (
            <div className="panel__header-actions">
              <button
                type="button"
                className="secondary"
                onClick={handleToggleTopRecommendations}
                disabled={topRecommendationIds.length === 0}
              >
                {areTopPicksSelected ? 'Deselect' : 'Select'} Top{' '}
                {Math.min(MAX_PICKS_PER_TURN, topRecommendationIds.length)}
              </button>
              <button
                type="button"
                onClick={handleConfirmPicks}
                disabled={confirmDisabled}
              >
                <FaArrowRight aria-label="Confirm Picks" />
              </button>
            </div>
          )}
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
                <Table.ScrollArea borderWidth="1px" rounded="md" maxH="420px">
                  <Table.Root size="sm" variant="outline" stickyHeader>
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader w="6"></Table.ColumnHeader>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>M/F</Table.ColumnHeader>
                        <Table.ColumnHeader>New?</Table.ColumnHeader>
                        <Table.ColumnHeader>Preferences</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {sortedCandidates.map((candidate) => {
                        const isSelected = selectedIds.includes(candidate.id)
                        const isRecommended = recommendedSet.has(candidate.id)
                        return (
                          <Table.Row
                            key={candidate.id}
                            className={`${isSelected ? 'is-selected' : ''} selectable-row`.trim()}
                            onClick={() => handleToggleSelection(candidate.id)}
                          >
                            <Table.Cell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${candidate.fullName}`}
                                checked={isSelected}
                                onChange={() => handleToggleSelection(candidate.id)}
                                disabled={
                                  !selectedIds.includes(candidate.id) &&
                                  selectedIds.length >= MAX_PICKS_PER_TURN
                                }
                                className="row-checkbox"
                              />
                            </Table.Cell>
                            <Table.Cell>
                              {isRecommended ? '⭐ ' : ''}
                              {candidate.fullName}
                            </Table.Cell>
                            <Table.Cell>
                              <RoleScore score={candidate.roleScore} />
                            </Table.Cell>
                            <Table.Cell>
                              {candidate.isNew ? (
                                <Badge colorPalette="purple" size="sm" variant="subtle">
                                  New
                                </Badge>
                              ) : (
                                <Badge colorPalette="gray" size="sm" variant="subtle">
                                  Returning
                                </Badge>
                              )}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="suite-pref-row">
                                <SuiteChip
                                  suite={candidate.suitePrefs.first ?? null}
                                  className="suite-pref-chip"
                                />
                                <SuiteChip
                                  suite={candidate.suitePrefs.second ?? null}
                                  className="suite-pref-chip"
                                />
                                <SuiteChip
                                  suite={candidate.suitePrefs.third ?? null}
                                  className="suite-pref-chip"
                                />
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                </Table.ScrollArea>
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
                  onClick={handleFinalizeSuite}
                  disabled={currentRoster.finalized}
                >
                  Finalize {currentSuite} Roster
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={onNavigateToExport}
                >
                  Export Rosters
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <aside className="roster-panel">
        <h2>Suite Rosters</h2>
        <Stack className="roster-list" gap="4">
          {rosterOrder.map((suite) => (
            <SuiteRosterCard
              key={suite}
              suite={suite}
              rosterIds={state.suites[suite].ids}
              finalized={state.suites[suite].finalized}
              dancers={dancerLookup}
              isCurrent={suite === currentSuite}
            />
          ))}
        </Stack>
      </aside>

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
  const avgClass = averageRoleScore >= 4 && averageRoleScore <= 6 ? 'avg-role-score--good' : 'avg-role-score--bad'

  const palette = getSuiteColor(suite)
  const suiteSlug = formatSuiteName(suite)
  const style: CSSProperties & Record<string, string> = {
    '--suite-color-base': palette.base,
    '--suite-color-soft': palette.soft,
    '--suite-color-contrast': palette.contrast,
  }

  return (
    <div
      className={`suite-card suite-card--${suiteSlug} ${
        isCurrent ? 'is-current' : ''
      }`.trim()}
      style={style}
    >
      <header>
        <h3>{suite}</h3>
        {finalized && <span className="badge">Finalized</span>}
      </header>
      <div className="suite-card__summary">
        <span>
          <strong>{rosterDancers.length}</strong> dancers
        </span>
        <span>
          <strong>{newCount}</strong> new : {returningCount} returning
        </span>
        <span>Avg M/F score <span className={`avg-role-score ${avgClass}`}>{averageRoleScore.toFixed(1)}</span></span>
      </div>
      {rosterDancers.length > 0 ? (
        <ul>
          {rosterDancers.map((dancer) => (
            <li key={dancer.id}>
              <strong>{dancer.fullName}</strong>
              <small>
                Role <RoleScore score={dancer.roleScore} />
                <span className="suite-card__prefs">
                  <SuiteChip
                    suite={dancer.suitePrefs.first ?? null}
                    className="suite-pref-chip"
                  />
                  <SuiteChip
                    suite={dancer.suitePrefs.second ?? null}
                    className="suite-pref-chip"
                  />
                  <SuiteChip
                    suite={dancer.suitePrefs.third ?? null}
                    className="suite-pref-chip"
                  />
                </span>
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

// Manual assignment UI removed per request
