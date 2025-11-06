import { useMemo, type CSSProperties } from 'react'
import {
  createAllAssignmentsCsv,
  createSuiteCsv,
  createSuiteSummaries,
  triggerCsvDownload,
} from '../lib/exporters'
import type { SuiteName } from '../types'
import { useDraftStore } from '../state/DraftProvider'
import { RoleScore } from '../components/RoleScore'
import { SuiteChip } from '../components/SuiteChip'
import { formatSuiteName, getSuiteColor } from '../lib/colors'

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
          {summaries.map((summary) => {
            const palette = getSuiteColor(summary.suite)
            const suiteSlug = formatSuiteName(summary.suite)
            const style: CSSProperties & Record<string, string> = {
              '--suite-color-base': palette.base,
              '--suite-color-soft': palette.soft,
              '--suite-color-contrast': palette.contrast,
            }

            return (
              <article
                key={summary.suite}
                className={`suite-export-card suite-card--${suiteSlug}`.trim()}
                style={style}
              >
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
                    <strong>{summary.newCount}</strong> new : {summary.returningCount}{' '}
                    returning
                  </li>
                  <li>
                    Avg M/F score{' '}
                    <span
                      className={`avg-role-score ${
                        summary.averageRoleScore >= 4 && summary.averageRoleScore <= 6
                          ? 'avg-role-score--good'
                          : 'avg-role-score--bad'
                      }`}
                    >
                      {summary.averageRoleScore.toFixed(1)}
                    </span>
                  </li>
                </ul>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => handleDownloadSuite(summary.suite)}
                >
                  Download {summary.suite} CSV
                </button>
              </article>
            )
          })}
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
                <strong>{dancer.fullName}</strong> • Role <RoleScore score={dancer.roleScore} /> •{' '}
                <span className="suite-pref-row">
                  <SuiteChip suite={dancer.suitePrefs.first ?? null} />
                  <SuiteChip suite={dancer.suitePrefs.second ?? null} />
                  <SuiteChip suite={dancer.suitePrefs.third ?? null} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
