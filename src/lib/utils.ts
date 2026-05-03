/**
 * Formats a number into Vietnamese currency format with dot separators and currency symbol.
 * @param value The number to format
 * @param includeSymbol Whether to include the ₫ symbol (default: true)
 * @returns Formatted string
 */
export function formatCurrency(value: number | string | undefined, includeSymbol: boolean = true): string {
  if (value === undefined || value === null || value === '') return includeSymbol ? '0 ₫' : '0';
  
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
  
  if (isNaN(numericValue)) return includeSymbol ? '0 ₫' : '0';

  const formatted = numericValue.toLocaleString('vi-VN');
  return includeSymbol ? `${formatted} ₫` : formatted;
}

/**
 * Parses a formatted currency string back into a number.
 * @param value Formatted string
 * @returns Numeric value
 */
export function parseCurrency(value: string): number {
  const numericString = value.replace(/[^0-9]/g, '');
  return parseInt(numericString, 10) || 0;
}
