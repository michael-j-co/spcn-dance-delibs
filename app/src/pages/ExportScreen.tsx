import { useMemo } from 'react'
import {
  createAllAssignmentsCsv,
  createSuiteCsv,
  createSuiteSummaries,
  triggerCsvDownload,
} from '../lib/exporters'
import type { SuiteName } from '../types'
import { useDraftStore } from '../state/DraftProvider'

export function ExportScreen() {
  const { state } = useDraftStore()

  if (!state) {
    return (
      <section className="panel">
        <div className="panel__body">
          <p>Import dancer data to enable exports.</p>
        </div>
      </section>
    )
  }

  const summaries = useMemo(() => createSuiteSummaries(state), [state])
  const unassigned = useMemo(
    () =>
      state.unassignedIds
        .map((id) => state.dancers.find((dancer) => dancer.id === id))
        .filter(
          (dancer): dancer is NonNullable<typeof dancer> => Boolean(dancer),
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [state],
  )

  const handleDownloadAll = () => {
    const file = createAllAssignmentsCsv(state)
    triggerCsvDownload(file.filename, file.content)
  }

  const handleDownloadSuite = (suite: SuiteName) => {
    const file = createSuiteCsv(state, suite)
    triggerCsvDownload(file.filename, file.content)
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Export Rosters</h2>
          <p>Download CSV files for the full draft and each suite roster.</p>
        </div>
        <button type="button" onClick={handleDownloadAll}>
          Download All Assignments
        </button>
      </header>

      <div className="panel__body">
        <div className="suite-export-grid">
          {summaries.map((summary) => (
            <article key={summary.suite} className="suite-export-card">
              <header>
                <h3>{summary.suite}</h3>
                {summary.finalized ? (
                  <span className="badge">Finalized</span>
                ) : (
                  <span className="badge badge--warning">Drafting</span>
                )}
              </header>
              <ul className="suite-export-meta">
                <li>
                  <strong>{summary.count}</strong> dancers
                </li>
                <li>
                  <strong>{summary.newCount}</strong> new /{' '}
                  {summary.returningCount} returning
                </li>
                <li>Avg role score {summary.averageRoleScore.toFixed(1)}</li>
              </ul>
              <button
                type="button"
                className="secondary"
                onClick={() => handleDownloadSuite(summary.suite)}
              >
                Download {summary.suite} CSV
              </button>
            </article>
          ))}
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="panel__body warning">
          <h3>Unassigned Dancers Remaining ({unassigned.length})</h3>
          <p>
            These dancers are not included in suite exports. Consider manual
            assignment before finalizing.
          </p>
          <ul className="unassigned-list">
            {unassigned.map((dancer) => (
              <li key={dancer.id}>
                <strong>{dancer.fullName}</strong> • Role {dancer.roleScore} •{' '}
                Prefs: {dancer.suitePrefs.first ?? '—'} /
                {dancer.suitePrefs.second ?? '—'} /
                {dancer.suitePrefs.third ?? '—'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
