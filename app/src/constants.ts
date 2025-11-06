import type { SuiteName } from './types'

export const SUITE_NAMES: SuiteName[] = [
  'Maria Clara',
  'Rural',
  'Arnis',
  'Mindanao',
  'Masa',
  'Ensemble',
]

export const SUITE_COLORS: Record<
  SuiteName,
  { base: string; soft: string; contrast: string }
> = {
  'Maria Clara': {
    base: '#D94690',
    soft: 'rgba(217, 70, 144, 0.18)',
    contrast: '#561537',
  },
  Rural: {
    base: '#0EA5E9',
    soft: 'rgba(14, 165, 233, 0.18)',
    contrast: '#0B445F',
  },
  Arnis: {
    base: '#F97316',
    soft: 'rgba(249, 115, 22, 0.18)',
    contrast: '#7A3306',
  },
  Mindanao: {
    base: '#22C55E',
    soft: 'rgba(34, 197, 94, 0.18)',
    contrast: '#11572D',
  },
  Masa: {
    base: '#8B5CF6',
    soft: 'rgba(139, 92, 246, 0.2)',
    contrast: '#3A1E8F',
  },
  Ensemble: {
    base: '#10B981',
    soft: 'rgba(16, 185, 129, 0.18)',
    contrast: '#0B4F39',
  },
}

export const STORAGE_KEY = 'spcn-draft-state'

export const MAX_RECOMMENDATIONS = 10
export const MAX_PICKS_PER_TURN = 10
