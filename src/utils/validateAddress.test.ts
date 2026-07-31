import { describe, it, expect } from 'vitest'
import { validateAddress, isAddressValid } from './validateAddress'
import type { Address } from '@/types'

const VALID: Address = {
  street: '123 Dev Lane',
  city: 'Cloud City',
  state: 'K8s',
  postalCode: '10101',
  country: 'US',
}

describe('validateAddress', () => {
  it('returns no errors for a fully populated address', () => {
    expect(validateAddress(VALID)).toEqual({})
    expect(isAddressValid(VALID)).toBe(true)
  })

  it('flags every empty field', () => {
    const errors = validateAddress({
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    })
    expect(Object.keys(errors).sort()).toEqual(
      ['city', 'country', 'postalCode', 'state', 'street'].sort()
    )
    expect(isAddressValid({ ...VALID, city: '   ' })).toBe(false)
  })
})
