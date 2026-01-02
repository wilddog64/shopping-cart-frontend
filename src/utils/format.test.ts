import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from './format'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(99.99, 'USD')).toBe('$99.99')
  })

  it('formats EUR correctly', () => {
    expect(formatCurrency(50, 'EUR')).toContain('50')
  })

  it('uses USD as default currency', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('handles large numbers', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })
})

describe('formatDate', () => {
  it('formats date string correctly', () => {
    // Use ISO format with timezone to avoid timezone issues
    const result = formatDate('2024-01-15T12:00:00Z')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  it('formats Date object correctly', () => {
    const date = new Date(2024, 0, 15, 12, 0, 0) // January 15, 2024 at noon
    const result = formatDate(date)
    expect(result).toContain('January')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})

describe('formatDateTime', () => {
  it('formats date and time correctly', () => {
    const result = formatDateTime('2024-01-15T10:30:00')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})
