import type { Dancer } from '../types'

export type GenderBucket = 'F' | 'N' | 'M'

export function getGenderBucket(score: number): GenderBucket {
  if (score <= 4) return 'F'
  if (score >= 6) return 'M'
  return 'N'
}

export function calcRosterMetrics(dancers: Dancer[]) {
  const total = dancers.length
  let newbies = 0
  let returning = 0
  let masc = 0
  let fem = 0
  let neutral = 0
  let roleSum = 0

  for (const d of dancers) {
    if (d.isNew) newbies += 1
    else returning += 1
    roleSum += d.roleScore
    const b = getGenderBucket(d.roleScore)
    if (b === 'M') masc += 1
    else if (b === 'F') fem += 1
    else neutral += 1
  }

  const avgRole = total ? roleSum / total : 0
  const newbieRatio = total ? newbies / total : 0
  const mascRatio = total ? masc / total : 0
  const femRatio = total ? fem / total : 0

  return {
    total,
    newbies,
    returning,
    masc,
    fem,
    neutral,
    avgRole,
    newbieRatio,
    mascRatio,
    femRatio,
  }
}

