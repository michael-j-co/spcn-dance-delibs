import Papa from 'papaparse'
import { SUITE_NAMES } from '../constants'
import type { Dancer, SuiteName } from '../types'

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
  const results = await new Promise<Papa.ParseResult<RawDancerRow>>(
    (resolve, reject) => {
      Papa.parse<RawDancerRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (output) => resolve(output),
        error: (error) => reject(error),
      })
    },
  )

  const headers = results.meta.fields ?? []
  ensureRequiredColumns(headers)

  const dancers: Dancer[] = results.data.map((row) => {
    const fullName = row['Full Name']?.trim()
    if (!fullName) {
      throw new Error('Full Name is required for every dancer.')
    }

    const dancer: Dancer = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
      fullName,
      suitePrefs: {
        first: normalizeSuiteName(row['1st Suite Preference'] ?? ''),
        second: normalizeSuiteName(row['2nd Suite Preference'] ?? ''),
        third: normalizeSuiteName(row['3rd Suite Preference'] ?? ''),
      },
      roleScore: toRoleScore(row['Role Preference Score'] ?? ''),
      isNew: toBoolean(row['New to SPCN?'] ?? ''),
      assignedSuite: undefined,
    }

    return dancer
  })

  return dancers
}
