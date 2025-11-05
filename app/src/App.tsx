import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ImportScreen } from './pages/ImportScreen'
import { DraftBoard } from './pages/DraftBoard'
import { ExportScreen } from './pages/ExportScreen'
import { useDraftStore } from './state/DraftProvider'
import { loadDraftState } from './lib/storage'
import { formatSuiteName, getActiveSuiteColor } from './lib/colors'

type AppView = 'import' | 'draft' | 'export'

const VIEW_LABELS: Record<AppView, string> = {
  import: 'Import',
  draft: 'Draft Board',
  export: 'Export',
}

function App() {
  const { state, actions, helpers } = useDraftStore()
  const [view, setView] = useState<AppView>('import')
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  useEffect(() => {
    if (!state) {
      setView('import')
    }
  }, [state])

  useEffect(() => {
    if (!state && helpers.hasSavedDraft) {
      setShowResumePrompt(true)
    }
  }, [helpers.hasSavedDraft, state])

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

  const handleResumeDraft = () => {
    const saved = loadDraftState()
    if (saved) {
      actions.hydrate(saved.state)
      setView('draft')
    }
    setShowResumePrompt(false)
  }

  const handleDiscardSaved = () => {
    actions.resetDraft()
    setShowResumePrompt(false)
    helpers.refreshSavedDraftFlag()
  }

  const handleClearDraft = () => {
    actions.resetDraft()
    setView('import')
    setShowResumePrompt(false)
  }

  const handleStartDraft = () => {
    setView('draft')
    setShowResumePrompt(false)
  }

  const handleGoToExport = () => {
    setView('export')
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
          <h1>SPCN Suite Drafting</h1>
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
          {state && (
            <button
              type="button"
              className="secondary"
              onClick={handleGoToExport}
            >
              Go to Export
            </button>
          )}
          <button
            type="button"
            className="danger"
            onClick={handleClearDraft}
          >
            Clear Draft Data
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'import' && (
          <ImportScreen onDraftReady={handleStartDraft} />
        )}
        {view === 'draft' && state && (
          <DraftBoard onNavigateToExport={handleGoToExport} />
        )}
        {view === 'export' && state && <ExportScreen />}
        {view !== 'import' && !state && (
          <section className="placeholder">
            <p>Import dancer data to begin drafting.</p>
          </section>
        )}
      </main>

      {showResumePrompt && (
        <ResumeDraftPrompt
          onResume={handleResumeDraft}
          onStartFresh={handleDiscardSaved}
        />
      )}
    </div>
  )
}

type ResumeDraftPromptProps = {
  onResume: () => void
  onStartFresh: () => void
}

function ResumeDraftPrompt({
  onResume,
  onStartFresh,
}: ResumeDraftPromptProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Resume saved draft?</h2>
        <p>
          We found an in-progress draft in your browser. Would you like to
          resume where you left off or start a new draft?
        </p>
        <div className="modal__actions">
          <button type="button" className="secondary" onClick={onStartFresh}>
            Start New Draft
          </button>
          <button type="button" onClick={onResume}>
            Resume Draft
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
