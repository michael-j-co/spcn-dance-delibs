import { useEffect, useMemo, useState } from 'react'
import type { ColumnMapping, FieldKey } from '../lib/csv'

type ColumnMapperModalProps = {
  headers: string[]
  previewRows: Record<string, string>[]
  initialMapping?: Partial<ColumnMapping>
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

const FIELD_ORDER: { key: FieldKey; label: string }[] = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'pref1', label: '1st Pref' },
  { key: 'pref2', label: '2nd Pref' },
  { key: 'pref3', label: '3rd Pref' },
  { key: 'roleScore', label: 'M/F Score' },
  { key: 'isNew', label: 'New?' },
]

export function ColumnMapperModal({
  headers,
  previewRows,
  initialMapping,
  onConfirm,
  onCancel,
}: ColumnMapperModalProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(initialMapping ?? {})
  const [error, setError] = useState<string | null>(null)

  const sampleFor = (header?: string): string[] => {
    if (!header) return []
    const vals = previewRows
      .map((r) => (r[header] ?? '').toString().trim())
      .filter(Boolean)
    const uniq: string[] = []
    for (const v of vals) {
      if (!uniq.includes(v)) uniq.push(v)
      if (uniq.length >= 3) break
    }
    return uniq
  }

  const chosen = useMemo(() => new Set(Object.values(mapping).filter(Boolean) as string[]), [mapping])

  const isValid = useMemo(() => {
    const required = FIELD_ORDER.map((f) => f.key)
    const picked = required.map((k) => mapping[k]).filter(Boolean) as string[]
    if (picked.length !== required.length) return false
    return new Set(picked).size === picked.length
  }, [mapping])

  useEffect(() => {
    setError(null)
  }, [mapping])

  const handleConfirm = () => {
    if (!isValid) {
      setError('Please select a unique column for every required field.')
      return
    }
    onConfirm(mapping as ColumnMapping)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Map CSV Columns</h2>
        <p>Select which columns match the required fields.</p>
        <div className="manual-form">
          {FIELD_ORDER.map((field) => (
            <label key={field.key}>
              {field.label}
              <select
                value={mapping[field.key] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              >
                <option value="">— Select —</option>
                {headers.map((h) => (
                  <option key={h} value={h} disabled={chosen.has(h) && mapping[field.key] !== h}>
                    {h}
                  </option>
                ))}
              </select>
              {mapping[field.key] && (
                <small>
                  Examples: {sampleFor(mapping[field.key])?.join(' · ') || '—'}
                </small>
              )}
            </label>
          ))}
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="panel__footer-actions" style={{ marginTop: 16 }}>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={!isValid}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColumnMapperModal

