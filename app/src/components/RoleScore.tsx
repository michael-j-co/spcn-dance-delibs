import type { HTMLAttributes } from 'react'

type RoleScoreProps = {
  score: number
} & HTMLAttributes<HTMLSpanElement>

export function RoleScore({ score, className = '', ...rest }: RoleScoreProps) {
  const colorClass =
    score <= 4 ? 'role-score--pink' : score === 5 ? 'role-score--grey' : 'role-score--blue'

  const classes = ['role-score', colorClass, className].filter(Boolean).join(' ').trim()

  return (
    <span className={classes} {...rest}>
      {score}
    </span>
  )
}

export default RoleScore

