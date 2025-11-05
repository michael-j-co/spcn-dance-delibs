import { STORAGE_KEY } from '../constants'
import type { DraftPersistedState } from '../types'

export function saveDraftState(payload: DraftPersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Failed to save draft state', error)
  }
}

export function loadDraftState(): DraftPersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftPersistedState
    return parsed
  } catch (error) {
    console.error('Failed to load draft state', error)
    return null
  }
}

export function clearDraftState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear draft state', error)
  }
}
