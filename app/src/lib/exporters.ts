import { SUITE_NAMES } from '../constants'
import type { DraftState, SuiteName } from '../types'

type CsvValue = string | number | boolean | undefined | null

function toCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function buildCsvContent(headers: string[], rows: CsvValue[][]): string {
  const headerLine = headers.map(toCsvValue).join(',')
  const rowLines = rows.map((row) => row.map(toCsvValue).join(','))
  return [headerLine, ...rowLines].join('\n')
}

export function createAllAssignmentsCsv(state: DraftState) {
  const headers = [
    'Full Name',
    'Assigned Suite',
    '1st Suite Preference',
    '2nd Suite Preference',
    '3rd Suite Preference',
    'Role Preference Score',
    'New to SPCN?',
  ]

  const rows = state.dancers.map((dancer) => [
    dancer.fullName,
    dancer.assignedSuite ?? '',
    dancer.suitePrefs.first,
    dancer.suitePrefs.second,
    dancer.suitePrefs.third,
    dancer.roleScore,
    dancer.isNew,
  ])

  return {
    filename: 'all_assignments.csv',
    content: buildCsvContent(headers, rows),
  }
}

export function createSuiteCsv(state: DraftState, suite: SuiteName) {
  const headers = [
    'Full Name',
    'Role Preference Score',
    'New to SPCN?',
    '1st Suite Preference',
    '2nd Suite Preference',
    '3rd Suite Preference',
  ]

  const rows = state.suites[suite].ids
    .map((id) => state.dancers.find((dancer) => dancer.id === id))
    .filter((dancer): dancer is NonNullable<typeof dancer> => Boolean(dancer))
    .map((dancer) => [
      dancer.fullName,
      dancer.roleScore,
      dancer.isNew,
      dancer.suitePrefs.first,
      dancer.suitePrefs.second,
      dancer.suitePrefs.third,
    ])

  return {
    filename: `suite_${suite.toLowerCase().replace(/\s+/g, '_')}.csv`,
    content: buildCsvContent(headers, rows),
  }
}

export function triggerCsvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function createSuiteSummaries(state: DraftState) {
  return SUITE_NAMES.map((suite) => {
    const rosterIds = state.suites[suite].ids
    const dancers = rosterIds
      .map((id) => state.dancers.find((dancer) => dancer.id === id))
      .filter((dancer): dancer is NonNullable<typeof dancer> => Boolean(dancer))

    const newCount = dancers.filter((dancer) => dancer.isNew).length
    const roleTotal = dancers.reduce(
      (sum, dancer) => sum + dancer.roleScore,
      0,
    )

    return {
      suite,
      count: dancers.length,
      newCount,
      returningCount: dancers.length - newCount,
      averageRoleScore: dancers.length
        ? roleTotal / dancers.length
        : 0,
      dancers,
      finalized: state.suites[suite].finalized,
    }
  })
}
