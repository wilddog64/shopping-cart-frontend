import type { Address } from '@/types'

export type AddressErrors = Partial<Record<keyof Address, string>>

const FIELD_LABELS: Record<keyof Address, string> = {
  street: 'Street',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
  country: 'Country',
}

export function validateAddress(address: Address): AddressErrors {
  const errors: AddressErrors = {}
  ;(Object.keys(FIELD_LABELS) as (keyof Address)[]).forEach((field) => {
    if (!address[field] || address[field].trim() === '') {
      errors[field] = `${FIELD_LABELS[field]} is required`
    }
  })
  return errors
}

export function isAddressValid(address: Address): boolean {
  return Object.keys(validateAddress(address)).length === 0
}
