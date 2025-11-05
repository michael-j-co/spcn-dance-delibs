import Papa from 'papaparse'
import { SUITE_NAMES } from '../constants'
import type { Dancer, SuiteName } from '../types'

// ----- Flexible mapping support -----
export type FieldKey =
  | 'fullName'
  | 'pref1'
  | 'pref2'
  | 'pref3'
  | 'roleScore'
  | 'isNew'

export type ColumnMapping = Record<FieldKey, string>

export async function parseCsv(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const results = await new Promise<Papa.ParseResult<Record<string, string>>>(
    (resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (output) => resolve(output),
        error: (error) => reject(error),
      })
    },
  )

  const headers = results.meta.fields ?? []
  const rows = results.data
  return { headers, rows }
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }))

  const find = (pred: (s: string) => boolean): string | undefined => {
    const hit = normalized.find(({ norm }) => pred(norm))
    return hit?.raw
  }

  const hasAll = (...tokens: string[]) => (s: string) => tokens.every((t) => s.includes(t))
  const starts = (...tokens: string[]) => (s: string) => tokens.every((t) => s.startsWith(t))

  const mapping: Partial<ColumnMapping> = {}

  mapping.fullName =
    find(hasAll('full', 'name')) ||
    find((s) => s === 'name' || s === 'fullname' || s === 'full name')

  mapping.pref1 =
    find(hasAll('1', 'pref')) ||
    find(hasAll('first', 'pref')) ||
    find(hasAll('1st', 'pref')) ||
    find(hasAll('1', 'suite', 'pref'))

  mapping.pref2 =
    find(hasAll('2', 'pref')) ||
    find(hasAll('second', 'pref')) ||
    find(hasAll('2nd', 'pref')) ||
    find(hasAll('2', 'suite', 'pref'))

  mapping.pref3 =
    find(hasAll('3', 'pref')) ||
    find(hasAll('third', 'pref')) ||
    find(hasAll('3rd', 'pref')) ||
    find(hasAll('3', 'suite', 'pref'))

  mapping.roleScore =
    find(hasAll('role', 'score')) ||
    find(hasAll('m', 'f', 'score')) ||
    find(hasAll('mf', 'score'))

  mapping.isNew =
    find((s) => s === 'new' || s === 'new to spcn') ||
    find(hasAll('new', 'spcn')) ||
    find((s) => s.includes('new') || s.includes('returning'))

  return mapping
}

export function validateMapping(
  mapping: Partial<ColumnMapping>,
  headers: string[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const required: FieldKey[] = [
    'fullName',
    'pref1',
    'pref2',
    'pref3',
    'roleScore',
    'isNew',
  ]

  for (const key of required) {
    const h = mapping[key]
    if (!h) {
      errors.push(`Missing mapping for ${key}`)
      continue
    }
    if (!headers.includes(h)) {
      errors.push(`Mapped header for ${key} not found: ${h}`)
    }
  }

  const chosen = required.map((k) => mapping[k]).filter(Boolean) as string[]
  const dups = new Set<string>()
  chosen.forEach((h, idx) => {
    if (chosen.indexOf(h) !== idx) dups.add(h)
  })
  if (dups.size) {
    errors.push(`Duplicate column selections: ${[...dups].join(', ')}`)
  }

  return { ok: errors.length === 0, errors }
}

export function parseDancersWithMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Dancer[] {
  const compressPrefs = (
    a: SuiteName | null,
    b: SuiteName | null,
    c: SuiteName | null,
  ): { first: SuiteName | null; second: SuiteName | null; third: SuiteName | null } => {
    const ordered = [a, b, c].filter(Boolean) as SuiteName[]
    return {
      first: ordered[0] ?? null,
      second: ordered[1] ?? null,
      third: ordered[2] ?? null,
    }
  }

  const dancers: Dancer[] = rows.map((row) => {
    const fullName = (row[mapping.fullName] ?? '').trim()
    if (!fullName) {
      throw new Error('Full Name is required for every dancer.')
    }

    const p1 = normalizeSuiteName(row[mapping.pref1] ?? '')
    const p2 = normalizeSuiteName(row[mapping.pref2] ?? '')
    const p3 = normalizeSuiteName(row[mapping.pref3] ?? '')
    const prefs = compressPrefs(p1, p2, p3)

    const dancer: Dancer = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      fullName,
      suitePrefs: {
        first: prefs.first,
        second: prefs.second,
        third: prefs.third,
      },
      roleScore: toRoleScore(row[mapping.roleScore] ?? ''),
      isNew: toBoolean(row[mapping.isNew] ?? ''),
      assignedSuite: undefined,
    }

    return dancer
  })

  return dancers
}

const REQUIRED_COLUMNS = [
  'Full Name',
  '1st Suite Preference',
  '2nd Suite Preference',
  '3rd Suite Preference',
  'New to SPCN?',
  'Role Preference Score',
] as const

type RawDancerRow = Record<(typeof REQUIRED_COLUMNS)[number], string>

const SUITE_ALIASES: Record<SuiteName, string[]> = {
  'Maria Clara': ['maria clara'],
  Rural: ['rural'],
  Arnis: ['arnis'],
  Mindanao: ['mindanao'],
  Masa: ['masa'],
}

const IGNORABLE_PREFERENCE_LABELS = ['script', 'ensemble']

function normalizeSuiteName(value: string): SuiteName | null {
  if (!value || !value.trim()) {
    return null
  }

  const trimmed = value.trim()
  const directMatch = SUITE_NAMES.find((suite) => suite === trimmed)
  if (directMatch) return directMatch

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z\s]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (
    IGNORABLE_PREFERENCE_LABELS.some((label) => normalized.includes(label)) ||
    IGNORABLE_PREFERENCE_LABELS.includes(trimmed.toLowerCase())
  ) {
    return null
  }

  const matchedSuite = (Object.entries(SUITE_ALIASES) as [SuiteName, string[]][])
    .find(([, aliases]) => aliases.some((alias) => normalized.includes(alias)))

  if (matchedSuite) {
    return matchedSuite[0]
  }

  return null
}

function toBoolean(value: string): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'yes' || normalized === 'true' || normalized === 'y'
}

function toRoleScore(value: string): number {
  const score = Number(value)
  if (Number.isNaN(score)) {
    throw new Error(`Role Preference Score must be numeric. Received "${value}"`)
  }
  return score
}

function ensureRequiredColumns(headers: string[]) {
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  )
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing
        .map((column) => `"${column}"`)
        .join(', ')}`,
    )
  }
}

export async function parseDancersFromCsv(file: File): Promise<Dancer[]> {
  // Backward-compatible path: use the old fixed column mapping
  const { headers, rows } = await parseCsv(file)
  ensureRequiredColumns(headers)
  const fixedMapping: ColumnMapping = {
    fullName: 'Full Name',
    pref1: '1st Suite Preference',
    pref2: '2nd Suite Preference',
    pref3: '3rd Suite Preference',
    isNew: 'New to SPCN?',
    roleScore: 'Role Preference Score',
  }
  return parseDancersWithMapping(rows as RawDancerRow[], fixedMapping)
}
