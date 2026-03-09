/**
 * Convert cents to dollar display string.
 * @example centsToDisplay(5000) // "$50.00"
 */
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
