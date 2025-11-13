import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ImportScreen } from './pages/ImportScreen'
import { DraftBoard } from './pages/DraftBoard'
import { ExportScreen } from './pages/ExportScreen'
import { FinalEditsScreen } from './pages/FinalEditsScreen'
import { useDraftStore } from './state/DraftProvider'
import { formatSuiteName, getActiveSuiteColor } from './lib/colors'

type AppView = 'import' | 'draft' | 'finalEdits' | 'export'

const VIEW_LABELS: Record<AppView, string> = {
  import: 'Import',
  draft: 'Draft Board',
  finalEdits: 'Final Edits',
  export: 'Export',
}

function App() {
  const { state, helpers } = useDraftStore()
  const [view, setView] = useState<AppView>('import')

  useEffect(() => {
    if (!state) {
      setView('import')
    }
  }, [state])

  // No resume prompt: draft state is not persisted

  const currentSuite = helpers.currentSuite
  const disableDraftViews = !state

  const navigation = useMemo(
    () =>
      (Object.keys(VIEW_LABELS) as AppView[]).map((key) => ({
        key,
        label: VIEW_LABELS[key],
        disabled: key !== 'import' && disableDraftViews,
      })),
    [disableDraftViews],
  )

  const handleStartDraft = () => {
    setView('draft')
  }

  const handleGoToExport = () => {
    setView('export')
  }

  const getNextStep = (): AppView | null => {
    switch (view) {
      case 'import':
        return 'draft'
      case 'draft':
        return 'finalEdits'
      case 'finalEdits':
        return 'export'
      default:
        return null
    }
  }

  const nextStepLabel = useMemo(() => {
    const next = getNextStep()
    return next ? `Next Step: ${VIEW_LABELS[next]}` : null
  }, [view])

  const handleGoToNextStep = () => {
    const next = getNextStep()
    if (!next) return
    // Prevent navigating to draft/final steps without state
    if (next !== 'import' && !state) return
    setView(next)
  }

  const isDraftView = view === 'draft'
  const activeColor = useMemo(
    () => getActiveSuiteColor(isDraftView ? currentSuite ?? undefined : undefined),
    [currentSuite, isDraftView],
  )

  const suiteClass = isDraftView && currentSuite
    ? `suite-theme--${formatSuiteName(currentSuite)}`
    : ''

  return (
    <div
      className={`app-shell ${suiteClass}`.trim()}
      style={{
        '--suite-color-base': activeColor.base,
        '--suite-color-soft': activeColor.soft,
        '--suite-color-contrast': activeColor.contrast,
      } as React.CSSProperties}
    >
      <header className="app-header">
        <div className="app-header__titles">
          <h1>SPCN Suite Delibs</h1>
          {isDraftView && state && (
            <p className="app-subtitle">
              Current turn:{' '}
              <strong>{currentSuite ?? 'Draft complete'}</strong>
            </p>
          )}
        </div>
        <nav className="app-nav">
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`app-nav__button ${
                view === item.key ? 'is-active' : ''
              }`}
              disabled={item.disabled}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="app-header__actions">
          {nextStepLabel && view !== 'export' && (
            <button
              type="button"
              className="secondary"
              onClick={handleGoToNextStep}
              disabled={!state}
            >
              {nextStepLabel}
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {view === 'import' && (
          <ImportScreen onDraftReady={handleStartDraft} />
        )}
        {view === 'draft' && state && (
          <DraftBoard onNavigateToExport={handleGoToExport} />
        )}
        {view === 'finalEdits' && state && <FinalEditsScreen />}
        {view === 'export' && state && <ExportScreen />}
        {view !== 'import' && !state && (
          <section className="placeholder">
            <p>Import cast data to begin drafting.</p>
          </section>
        )}
      </main>

      {/* No resume prompt: persistence removed */}
  </div>
  )
}

export default App
