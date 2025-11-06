import { useMemo, useState, type ChangeEvent } from 'react'
import {
  autoDetectMapping,
  parseCsv,
  parseDancersWithMapping,
  validateMapping,
  type ColumnMapping,
} from '../lib/csv'
import { RoleScore } from '../components/RoleScore'
import { ColumnMapperModal } from '../components/ColumnMapperModal'
import type { Dancer } from '../types'
import { useDraftStore } from '../state/DraftProvider'
import { SuiteChip } from '../components/SuiteChip'

type ImportScreenProps = {
  onDraftReady: () => void
}

type ParseStatus = 'idle' | 'loading' | 'success' | 'error'

export function ImportScreen({ onDraftReady }: ImportScreenProps) {
  const { actions } = useDraftStore()
  const [status, setStatus] = useState<ParseStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dancers, setDancers] = useState<Dancer[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [showMapper, setShowMapper] = useState(false)
  const [pendingMapping, setPendingMapping] = useState<Partial<ColumnMapping>>({})

  const preferenceGaps = useMemo(() => {
    if (!dancers.length) return null
    let missingFirst = 0
    let missingSecond = 0
    let missingThird = 0

    dancers.forEach((dancer) => {
      if (!dancer.suitePrefs.first) missingFirst += 1
      if (!dancer.suitePrefs.second) missingSecond += 1
      if (!dancer.suitePrefs.third) missingThird += 1
    })

    if (!missingFirst && !missingSecond && !missingThird) {
      return null
    }

    return { missingFirst, missingSecond, missingThird }
  }, [dancers])

  const headerSignature = (headers: string[]) => headers.slice().sort().join(' | ')
  const loadSavedMapping = (headers: string[]): Partial<ColumnMapping> | null => {
    try {
      const key = `csv-mapping::${headerSignature(headers)}`
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as ColumnMapping) : null
    } catch {
      return null
    }
  }
  const saveMapping = (headers: string[], mapping: ColumnMapping) => {
    try {
      const key = `csv-mapping::${headerSignature(headers)}`
      localStorage.setItem(key, JSON.stringify(mapping))
    } catch {}
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('loading')
    setError(null)
    try {
      const { headers, rows } = await parseCsv(file)
      setRawHeaders(headers)
      setRawRows(rows)
      const saved = loadSavedMapping(headers) || {}
      const auto = autoDetectMapping(headers)
      const combined = { ...auto, ...saved }

      const { ok } = validateMapping(combined, headers)
      if (!ok) {
        setPendingMapping(combined)
        setShowMapper(true)
        setStatus('idle')
        setFileName(file.name)
        return
      }

      const parsed = parseDancersWithMapping(rows, combined as ColumnMapping)
      setDancers(parsed)
      setFileName(file.name)
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to parse the selected CSV file.',
      )
      setDancers([])
      setFileName(null)
    } finally {
      event.target.value = ''
    }
  }

  const handleStartDraft = () => {
    if (!dancers.length) return
    actions.initializeDraft(dancers)
    onDraftReady()
  }

  const handleResetImport = () => {
    setDancers([])
    setStatus('idle')
    setError(null)
    setFileName(null)
  }

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Import Dancer Data</h2>
          <p>
            Upload the CSV export of dancer submissions. Required fields are
            validated on import.
          </p>
        </div>
        <label className="file-input">
          <span>Select CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
        </label>
      </header>

      {status === 'loading' && (
        <div className="panel__body">
          <p>Parsing CSV…</p>
        </div>
      )}

      {status === 'error' && error && (
        <div className="panel__body error">
          <p>{error}</p>
          <button type="button" className="secondary" onClick={handleResetImport}>
            Try Again
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="panel__body">
          <div className="import-summary">
            <div>
              <strong>File:</strong> {fileName}
            </div>
            <div>
              <strong>Dancers:</strong> {dancers.length}
            </div>
          </div>
          <div className="alert info">
            Preferences are compacted: if earlier preferences are empty or
            marked as “script”, later preferences shift up to fill gaps.
          </div>
          {preferenceGaps && (
            <div className="alert warning">
              <strong>Heads up:</strong>{' '}
              <span>
                {[
                  preferenceGaps.missingFirst
                    ? `${preferenceGaps.missingFirst} missing 1st pref`
                    : null,
                  preferenceGaps.missingSecond
                    ? `${preferenceGaps.missingSecond} missing 2nd pref`
                    : null,
                  preferenceGaps.missingThird
                    ? `${preferenceGaps.missingThird} missing 3rd pref`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          )}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>1st Pref</th>
                  <th>2nd Pref</th>
                  <th>3rd Pref</th>
                  <th>M/F Score</th>
                  <th>New?</th>
                </tr>
              </thead>
              <tbody>
                {dancers.map((dancer) => (
                  <tr key={dancer.id}>
                    <td>{dancer.fullName}</td>
                    <td>
                      <SuiteChip suite={dancer.suitePrefs.first ?? null} />
                    </td>
                    <td>
                      <SuiteChip suite={dancer.suitePrefs.second ?? null} />
                    </td>
                    <td>
                      <SuiteChip suite={dancer.suitePrefs.third ?? null} />
                    </td>
                    <td><RoleScore score={dancer.roleScore} /></td>
                    <td>{dancer.isNew ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="panel__footer">
            <button type="button" className="secondary" onClick={handleResetImport}>
              Clear Selection
            </button>
            <button type="button" onClick={handleStartDraft}>
              Start Draft
            </button>
          </footer>
        </div>
      )}

      {status === 'idle' && (
        <div className="panel__body">
          <p>
            Select a CSV file to review dancers before starting the draft.
          </p>
        </div>
      )}

      {showMapper && (
        <ColumnMapperModal
          headers={rawHeaders}
          previewRows={rawRows.slice(0, 20)}
          initialMapping={pendingMapping}
          onCancel={() => {
            setShowMapper(false)
            setPendingMapping({})
          }}
          onConfirm={(mapping) => {
            const { ok, errors } = validateMapping(mapping, rawHeaders)
            if (!ok) {
              setError(errors.join('\n'))
              return
            }
            try {
              const parsed = parseDancersWithMapping(rawRows, mapping)
              saveMapping(rawHeaders, mapping)
              setDancers(parsed)
              setStatus('success')
              setShowMapper(false)
            } catch (err) {
              console.error(err)
              setError(
                err instanceof Error ? err.message : 'Failed to parse CSV with mapping.',
              )
              setStatus('error')
              setShowMapper(false)
            }
          }}
        />
      )}
    </section>
  )
}
