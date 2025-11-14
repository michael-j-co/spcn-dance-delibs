import { useState } from 'react'
import { Badge, Box, Button, Center, FileUpload, Table } from '@chakra-ui/react'
import type { FileUpload as FileUploadNS } from '@chakra-ui/react'
import { HiUpload } from 'react-icons/hi'
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
  const [uploadKey, setUploadKey] = useState(0)

  // Preference gaps are expected and no longer surfaced as a warning

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
    } catch (err) {
      // Non-fatal: mapping persistence can fail (e.g., storage quota/permissions)
      console.warn('Failed to save CSV mapping to localStorage', err)
    }
  }

  const handleFiles = async (files: File[]) => {
    const file = files?.[0]
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
      // No-op: Chakra's FileUpload manages its own input value
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
    setUploadKey((i) => i + 1)
  }

  return (
    <Center w="100%">
      <Box px="2" w="100%" maxW="4xl">
        <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Import Dancer Data</h2>
          <p>
            Upload the CSV export of preference form submissions. Required fields are
            validated on import.
          </p>
        </div>
        <FileUpload.Root
          key={uploadKey}
          accept={["text/csv"]}
          maxFiles={1}
          onFileChange={(details: FileUploadNS.FileChangeDetails) => {
            const accepted = details?.acceptedFiles ?? []
            if (accepted.length > 0) {
              void handleFiles(accepted)
            }
          }}
          onFileReject={() => {
            setError('Only CSV files are allowed.')
            setStatus('error')
          }}
        >
          <FileUpload.HiddenInput />
          <Box display="inline-flex" gap="2">
            <FileUpload.Trigger asChild>
              <Button variant="outline" size="sm">
                <HiUpload /> Upload CSV
              </Button>
            </FileUpload.Trigger>
            <FileUpload.ClearTrigger asChild>
              <Button variant="ghost" size="xs" onClick={handleResetImport}>
                Clear
              </Button>
            </FileUpload.ClearTrigger>
          </Box>
          <FileUpload.List />
        </FileUpload.Root>
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
          {rawRows.length > dancers.length && (
            <div className="alert warning">
              Imported {rawRows.length} rows but only {dancers.length} dancers have usable
              suite preferences. Rows without any recognizable suite selections (blank or
              marked as “Script”) are ignored.
            </div>
          )}
          <div className="alert info">
            Preferences are compacted: if earlier preferences are empty or
            marked as “script”, later preferences shift up to fill gaps.
          </div>
          {/* Omitted heads-up warning for missing preferences */}
          <Table.ScrollArea borderWidth="1px" rounded="md" maxH="420px">
            <Table.Root size="sm" variant="outline" stickyHeader>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>1st Pref</Table.ColumnHeader>
                  <Table.ColumnHeader>2nd Pref</Table.ColumnHeader>
                  <Table.ColumnHeader>3rd Pref</Table.ColumnHeader>
                  <Table.ColumnHeader>M/F Score</Table.ColumnHeader>
                  <Table.ColumnHeader>New?</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {dancers.map((dancer) => (
                  <Table.Row key={dancer.id}>
                    <Table.Cell>{dancer.fullName}</Table.Cell>
                    <Table.Cell>
                      <SuiteChip suite={dancer.suitePrefs.first ?? null} />
                    </Table.Cell>
                    <Table.Cell>
                      <SuiteChip suite={dancer.suitePrefs.second ?? null} />
                    </Table.Cell>
                    <Table.Cell>
                      <SuiteChip suite={dancer.suitePrefs.third ?? null} />
                    </Table.Cell>
                    <Table.Cell>
                      <RoleScore score={dancer.roleScore} />
                    </Table.Cell>
                    <Table.Cell>
                      {dancer.isNew ? (
                        <Badge colorPalette="purple" size="sm" variant="subtle">
                          New
                        </Badge>
                      ) : (
                        <Badge colorPalette="gray" size="sm" variant="subtle">
                          Returning
                        </Badge>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
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
      </Box>
    </Center>
  )
}
