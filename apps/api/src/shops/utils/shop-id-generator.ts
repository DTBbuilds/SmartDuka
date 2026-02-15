/**
 * Shop ID Generator Utility
 * Generates human-readable shop IDs in format: SHP-XXXXX-XXXXX
 * Example: SHP-00001-A7K2B
 */

/**
 * Generate a human-readable shop ID
 * Format: SHP-{sequential-number}-{random-code}
 * 
 * @param sequenceNumber - Sequential number (e.g., 1, 2, 3...)
 * @returns Human-readable shop ID
 * 
 * @example
 * generateShopId(1) => "SHP-00001-A7K2B"
 * generateShopId(42) => "SHP-00042-M9X5L"
 */
export function generateShopId(sequenceNumber: number): string {
  // Format sequence number with leading zeros (5 digits)
  const sequencePart = String(sequenceNumber).padStart(5, '0');
  
  // Generate random alphanumeric code (5 characters, uppercase)
  const randomCode = generateRandomCode(5);
  
  // Combine into human-readable format
  return `SHP-${sequencePart}-${randomCode}`;
}

/**
 * Generate a random alphanumeric code
 * Uses uppercase letters and numbers (excludes I, O, 0, 1 to avoid confusion)
 * 
 * @param length - Length of the code
 * @returns Random alphanumeric code
 */
function generateRandomCode(length: number): string {
  // Exclude I, O, 0, 1 to avoid confusion
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  
  return result;
}

/**
 * Extract sequence number from shop ID
 * 
 * @param shopId - Shop ID in format SHP-XXXXX-XXXXX
 * @returns Sequence number or null if invalid format
 */
export function extractSequenceNumber(shopId: string): number | null {
  const match = shopId.match(/^SHP-(\d{5})-[A-Z0-9]{5}$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Validate shop ID format
 * 
 * @param shopId - Shop ID to validate
 * @returns True if valid format, false otherwise
 */
export function isValidShopId(shopId: string): boolean {
  return /^SHP-\d{5}-[A-Z0-9]{5}$/.test(shopId);
}

/**
 * Get next sequence number for a new shop
 * This should be called from the database to get the next sequential number
 * 
 * @param lastSequenceNumber - Last sequence number used
 * @returns Next sequence number
 */
export function getNextSequenceNumber(lastSequenceNumber: number): number {
  return lastSequenceNumber + 1;
}
