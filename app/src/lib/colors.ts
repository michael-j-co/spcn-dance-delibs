import { SUITE_COLORS, SUITE_NAMES } from '../constants'
import type { SuiteName } from '../types'

export function getSuiteColor(suite: SuiteName) {
  return SUITE_COLORS[suite]
}

export function getSuiteCssVar(suite: SuiteName, suffix: 'base' | 'soft' | 'contrast') {
  return `--suite-${formatSuiteName(suite)}-${suffix}`
}

export function formatSuiteName(suite: SuiteName) {
  return suite.toLowerCase().replace(/\s+/g, '-')
}

export const DEFAULT_SUITE_COLOR = SUITE_COLORS['Maria Clara']

export function getActiveSuiteColor(suite?: SuiteName | null) {
  if (!suite || !SUITE_NAMES.includes(suite)) return DEFAULT_SUITE_COLOR
  return SUITE_COLORS[suite]
}
