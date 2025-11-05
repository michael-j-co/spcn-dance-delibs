import type { CSSProperties } from 'react'
import type { SuiteName } from '../types'
import { getSuiteColor } from '../lib/colors'

type SuiteChipProps = {
  suite: SuiteName | null
  className?: string
  showPlaceholder?: boolean
  placeholderLabel?: string
}

export function SuiteChip({
  suite,
  className,
  showPlaceholder = true,
  placeholderLabel = '—',
}: SuiteChipProps) {
  if (!suite) {
    if (!showPlaceholder) {
      return null
    }
    return (
      <span className={`suite-chip is-empty ${className ?? ''}`.trim()}>
        {placeholderLabel}
      </span>
    )
  }

  const palette = getSuiteColor(suite)

  return (
    <span
      className={`suite-chip ${className ?? ''}`.trim()}
      style={{
        '--chip-color': palette.soft,
        '--chip-border': palette.base,
        '--chip-contrast': palette.contrast,
      } as CSSProperties}
    >
      {suite}
    </span>
  )
}
