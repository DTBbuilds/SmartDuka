/**
 * M-Pesa Sandbox Test Numbers and Simulation Configuration
 * 
 * These are the official Safaricom sandbox test numbers that work with M-Pesa sandbox.
 * Real phone numbers should NOT be used in sandbox mode - they will get an error.
 * 
 * Documentation: https://developer.safaricom.co.ke/Documentation
 */

// Official Safaricom sandbox test numbers
export const MPESA_SANDBOX_TEST_NUMBERS = [
  '254708374149', // Primary sandbox test number (success)
  '254700000000', // Test number - simulates success
  '254711111111', // Test number - simulates success
  '254722222222', // Test number - simulates user cancelled
  '254733333333', // Test number - simulates timeout/no response
  '254744444444', // Test number - simulates wrong PIN
  '254755555555', // Test number - simulates insufficient funds
  '254766666666', // Test number - simulates failed transaction
  '254777777777', // Test number - simulates success
  '254788888888', // Test number - simulates success
  '254799999999', // Test number - simulates system error
];

// Alternative patterns for sandbox numbers (for flexibility)
export const SANDBOX_NUMBER_PATTERNS = [
  /^2547083741\d{2}$/, // Variations of the official test number
  /^254700000\d{3}$/,  // 254700000XXX pattern
];

/**
 * Simulation scenarios based on phone number
 * Each scenario defines how the sandbox should respond
 */
export enum SandboxSimulationScenario {
  SUCCESS = 'success',
  USER_CANCELLED = 'user_cancelled',
  TIMEOUT = 'timeout',
  WRONG_PIN = 'wrong_pin',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  FAILED = 'failed',
  SYSTEM_ERROR = 'system_error',
}

/**
 * Map phone numbers to simulation scenarios
 */
export const SANDBOX_SIMULATION_MAP: Record<string, SandboxSimulationScenario> = {
  '254708374149': SandboxSimulationScenario.SUCCESS,
  '254700000000': SandboxSimulationScenario.SUCCESS,
  '254711111111': SandboxSimulationScenario.SUCCESS,
  '254722222222': SandboxSimulationScenario.USER_CANCELLED,
  '254733333333': SandboxSimulationScenario.TIMEOUT,
  '254744444444': SandboxSimulationScenario.WRONG_PIN,
  '254755555555': SandboxSimulationScenario.INSUFFICIENT_FUNDS,
  '254766666666': SandboxSimulationScenario.FAILED,
  '254777777777': SandboxSimulationScenario.SUCCESS,
  '254788888888': SandboxSimulationScenario.SUCCESS,
  '254799999999': SandboxSimulationScenario.SYSTEM_ERROR,
};

/**
 * M-Pesa result codes for simulation
 */
export const MPESA_RESULT_CODES = {
  SUCCESS: 0,
  INSUFFICIENT_FUNDS: 1,
  LESS_THAN_MIN_AMOUNT: 2,
  MORE_THAN_MAX_AMOUNT: 3,
  DAILY_LIMIT_EXCEEDED: 4,
  INVALID_TRANSACTION: 5,
  INVALID_ACCOUNT: 6,
  INVALID_PHONE: 7,
  INVALID_PHONE_FORMAT: 8,
  DUPLICATE_DETECTED: 9,
  SYSTEM_BUSY: 17,
  USER_CANCELLED: 1032,
  TIMEOUT: 1037,
  WRONG_PIN: 2001,
};

/**
 * Simulation response data for each scenario
 */
export interface SimulationResponse {
  resultCode: number;
  resultDesc: string;
  delayMs: number; // Simulated delay before response
  shouldSucceed: boolean;
}

export const SIMULATION_RESPONSES: Record<SandboxSimulationScenario, SimulationResponse> = {
  [SandboxSimulationScenario.SUCCESS]: {
    resultCode: MPESA_RESULT_CODES.SUCCESS,
    resultDesc: 'The service request is processed successfully.',
    delayMs: 8000, // 8 seconds to simulate user entering PIN
    shouldSucceed: true,
  },
  [SandboxSimulationScenario.USER_CANCELLED]: {
    resultCode: MPESA_RESULT_CODES.USER_CANCELLED,
    resultDesc: 'Request cancelled by user.',
    delayMs: 5000,
    shouldSucceed: false,
  },
  [SandboxSimulationScenario.TIMEOUT]: {
    resultCode: MPESA_RESULT_CODES.TIMEOUT,
    resultDesc: 'The initiator information is invalid.',
    delayMs: 30000, // 30 seconds timeout
    shouldSucceed: false,
  },
  [SandboxSimulationScenario.WRONG_PIN]: {
    resultCode: MPESA_RESULT_CODES.WRONG_PIN,
    resultDesc: 'Wrong PIN entered.',
    delayMs: 10000,
    shouldSucceed: false,
  },
  [SandboxSimulationScenario.INSUFFICIENT_FUNDS]: {
    resultCode: MPESA_RESULT_CODES.INSUFFICIENT_FUNDS,
    resultDesc: 'Insufficient funds in your M-PESA account.',
    delayMs: 6000,
    shouldSucceed: false,
  },
  [SandboxSimulationScenario.FAILED]: {
    resultCode: MPESA_RESULT_CODES.INVALID_TRANSACTION,
    resultDesc: 'Transaction failed. Please try again.',
    delayMs: 4000,
    shouldSucceed: false,
  },
  [SandboxSimulationScenario.SYSTEM_ERROR]: {
    resultCode: MPESA_RESULT_CODES.SYSTEM_BUSY,
    resultDesc: 'System is busy. Please try again later.',
    delayMs: 3000,
    shouldSucceed: false,
  },
};

/**
 * Check if a phone number is a valid sandbox test number
 */
export function isSandboxTestNumber(phoneNumber: string): boolean {
  // Direct match
  if (MPESA_SANDBOX_TEST_NUMBERS.includes(phoneNumber)) {
    return true;
  }
  
  // Pattern match
  return SANDBOX_NUMBER_PATTERNS.some(pattern => pattern.test(phoneNumber));
}

/**
 * Get the simulation scenario for a phone number
 * Defaults to SUCCESS if number is valid but not in map
 */
export function getSimulationScenario(phoneNumber: string): SandboxSimulationScenario {
  return SANDBOX_SIMULATION_MAP[phoneNumber] || SandboxSimulationScenario.SUCCESS;
}

/**
 * Get simulation response for a phone number
 */
export function getSimulationResponse(phoneNumber: string): SimulationResponse {
  const scenario = getSimulationScenario(phoneNumber);
  return SIMULATION_RESPONSES[scenario];
}

/**
 * Generate a fake M-Pesa receipt number for sandbox
 */
export function generateSandboxReceiptNumber(): string {
  const timestamp = Date.now().toString().slice(-10);
  return `SB${timestamp}`;
}

/**
 * Error message for non-sandbox numbers in sandbox mode
 */
export const SANDBOX_MODE_ERROR = {
  code: 'SANDBOX_ONLY',
  message: 'M-Pesa is in SANDBOX mode. Real phone numbers cannot be used for testing. Please use one of the sandbox test numbers:\n\n' +
    '• 254708374149 - Success scenario\n' +
    '• 254711111111 - Success scenario\n' +
    '• 254722222222 - User cancelled\n' +
    '• 254733333333 - Timeout (no PIN entry)\n' +
    '• 254744444444 - Wrong PIN\n' +
    '• 254755555555 - Insufficient funds\n' +
    '• 254766666666 - Failed transaction\n\n' +
    'Switch to PRODUCTION mode for real payments.',
};
