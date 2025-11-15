import { useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import type { Dancer, SuiteName } from '../types'
import { useDraftStore } from '../state/DraftProvider'
import { RoleScore } from '../components/RoleScore'
import { SuiteChip } from '../components/SuiteChip'
import { formatSuiteName, getSuiteColor } from '../lib/colors'
import { calcRosterMetrics } from '../lib/metrics'

export function FinalEditsScreen() {
  const { state, actions } = useDraftStore()
  const [dragOverSuite, setDragOverSuite] = useState<SuiteName | null>(null)

  if (!state) {
    return (
      <section className="panel">
        <div className="panel__body">
          <p>Import cast member data to begin.</p>
        </div>
      </section>
    )
  }

  const dancerLookup = useMemo(() => {
    const map = new Map<string, Dancer>()
    state.dancers.forEach((d) => map.set(d.id, d))
    return map
  }, [state.dancers])

  const columns = state.suiteOrder.map((suite) => {
    const ids = state.suites[suite].ids
    const dancers = ids
      .map((id) => dancerLookup.get(id))
      .filter((d): d is Dancer => Boolean(d))
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
    return { suite, dancers, finalized: state.suites[suite].finalized }
  })

  const onDragStart = (event: DragEvent, dancerId: string, from?: SuiteName) => {
    event.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ dancerId, from }),
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (event: DragEvent, suite: SuiteName) => {
    event.preventDefault()
    setDragOverSuite(suite)
  }

  const onDragLeave = () => setDragOverSuite(null)

  const onDrop = (event: DragEvent, to: SuiteName) => {
    event.preventDefault()
    try {
      const payload = JSON.parse(event.dataTransfer.getData('text/plain')) as {
        dancerId: string
        from?: SuiteName
      }
      if (payload?.dancerId) {
        actions.moveDancer(payload.dancerId, to)
      }
    } catch {
      // ignore
    } finally {
      setDragOverSuite(null)
    }
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Final Edits</h2>
          <p>Drag dancers between suite rosters to move them.</p>
        </div>
      </header>
      <div className="panel__body">
        <div className="final-edits-grid">
          {columns.map(({ suite, dancers, finalized }) => {
            const palette = getSuiteColor(suite)
            const suiteSlug = formatSuiteName(suite)
            const style: CSSProperties & Record<string, string> = {
              '--suite-color-base': palette.base,
              '--suite-color-soft': palette.soft,
              '--suite-color-contrast': palette.contrast,
            }
            const metrics = calcRosterMetrics(dancers)
            const avgClass = metrics.avgRole >= 4 && metrics.avgRole <= 6 ? 'avg-role-score--good' : 'avg-role-score--bad'
            const isOver = dragOverSuite === suite
            return (
              <div
                key={suite}
                className={`suite-card suite-card--${suiteSlug} final-edits-column ${
                  isOver ? 'is-drag-over' : ''
                }`.trim()}
                style={style}
                onDragOver={(e) => onDragOver(e, suite)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, suite)}
                role="list"
                aria-label={`${suite} roster`}
              >
                <header>
                  <h3>{suite}</h3>
                  {finalized && <span className="badge">Finalized</span>}
                </header>
                <div className="suite-card__summary">
                  <span>
                    <strong>{metrics.total}</strong> dancers
                  </span>
                  <span>
                    <strong>{metrics.newbies}</strong> new : {metrics.returning} returning
                  </span>
                  <span>
                    Avg M/F score{' '}
                    <span className={`avg-role-score ${avgClass}`}>
                      {metrics.avgRole.toFixed(1)}
                    </span>
                  </span>
                </div>
                {dancers.length > 0 ? (
                  <ul className="final-edits-list">
                    {dancers.map((dancer) => (
                      <li
                        key={dancer.id}
                        role="listitem"
                        draggable
                        onDragStart={(e) => onDragStart(e, dancer.id, suite)}
                        className="final-edits-item"
                      >
                        <div className="final-edits-item__main">
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
                        </div>
                        {/* Drag-and-drop only; no fallback controls */}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty">No dancers assigned yet.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
export default FinalEditsScreen
