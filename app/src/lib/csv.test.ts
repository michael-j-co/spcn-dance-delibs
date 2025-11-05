import { describe, expect, it } from 'vitest'
import { parseDancersFromCsv } from './csv'

const baseHeaders = [
  'Full Name',
  '1st Suite Preference',
  '2nd Suite Preference',
  '3rd Suite Preference',
  'New to SPCN?',
  'Role Preference Score',
] as const

const createCsv = (rows: string[]) => {
  return [baseHeaders.join(','), ...rows].join('\n')
}

describe('parseDancersFromCsv', () => {
  it('parses valid dancer rows and normalises fields', async () => {
    const csv = createCsv([
      'Alex Doe,Maria Clara,Rural,Arnis,Yes,7',
      'Jamie Lee,Rural,Maria Clara,Mindanao,no,5',
    ])
    const file = new File([csv], 'dancers.csv', { type: 'text/csv' })

    const dancers = await parseDancersFromCsv(file)

    expect(dancers).toHaveLength(2)
    expect(dancers[0]).toMatchObject({
      fullName: 'Alex Doe',
      suitePrefs: {
        first: 'Maria Clara',
        second: 'Rural',
        third: 'Arnis',
      },
      roleScore: 7,
      isNew: true,
    })
    expect(dancers[1]).toMatchObject({
      fullName: 'Jamie Lee',
      suitePrefs: {
        first: 'Rural',
        second: 'Maria Clara',
        third: 'Mindanao',
      },
      roleScore: 5,
      isNew: false,
    })
  })

  it('throws when required columns are missing', async () => {
    const csv = ['Full Name,Role Preference Score', 'Alex Doe,7'].join('\n')
    const file = new File([csv], 'invalid.csv', { type: 'text/csv' })

    await expect(parseDancersFromCsv(file)).rejects.toThrow(
      /Missing required columns/i,
    )
  })

  it('treats unknown preference values as unassigned', async () => {
    const csv = createCsv([
      'Alex Doe,Unknown,Rural,Arnis,Yes,7',
    ])
    const file = new File([csv], 'invalid.csv', { type: 'text/csv' })

    const [dancer] = await parseDancersFromCsv(file)

    expect(dancer.suitePrefs).toEqual({
      first: null,
      second: 'Rural',
      third: 'Arnis',
    })
  })

  it('handles descriptive suite labels and accented characters', async () => {
    const csv = createCsv([
      'Alex Doe,María Clara (partner dances),Rural (description),Arnis (something),Yes,7',
    ])
    const file = new File([csv], 'descriptive.csv', { type: 'text/csv' })

    const [dancer] = await parseDancersFromCsv(file)

    expect(dancer.suitePrefs).toEqual({
      first: 'Maria Clara',
      second: 'Rural',
      third: 'Arnis',
    })
  })

  it('supports blank secondary preferences', async () => {
    const csv = createCsv([
      ['Alex Doe', 'María Clara', '', '', 'Yes', '7'].join(','),
    ])
    const file = new File([csv], 'missing.csv', { type: 'text/csv' })

    const [dancer] = await parseDancersFromCsv(file)

    expect(dancer.suitePrefs).toEqual({
      first: 'Maria Clara',
      second: null,
      third: null,
    })
  })

  it('ignores Script and Ensemble preference entries', async () => {
    const csv = createCsv([
      [
        'Alex Doe',
        'María Clara',
        'Script',
        'Ensemble',
        'Yes',
        '7',
      ].join(','),
    ])
    const file = new File([csv], 'ignored.csv', { type: 'text/csv' })

    const [dancer] = await parseDancersFromCsv(file)

    expect(dancer.suitePrefs).toEqual({
      first: 'Maria Clara',
      second: null,
      third: null,
    })
  })
})
