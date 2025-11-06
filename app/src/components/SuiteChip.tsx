import type { SuiteName } from '../types'
import { Badge } from '@chakra-ui/react'

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
      <Badge
        className={className}
        colorPalette="gray"
        size="sm"
        variant="subtle"
      >
        {placeholderLabel}
      </Badge>
    )
  }

  const suitePalette: Record<SuiteName, 'pink' | 'blue' | 'orange' | 'green' | 'purple' | 'teal'> = {
    'Maria Clara': 'pink',
    Rural: 'blue',
    Arnis: 'orange',
    Mindanao: 'green',
    Masa: 'purple',
    Ensemble: 'teal',
  }

  return (
    <Badge
      className={className}
      colorPalette={suitePalette[suite]}
      size="sm"
      variant="subtle"
    >
      {suite}
    </Badge>
  )
}
