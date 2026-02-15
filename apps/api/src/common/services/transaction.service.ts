import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';

/**
 * Transaction Service - MongoDB transaction helper with replica set detection
 * 
 * Features:
 * - Automatic replica set detection
 * - Graceful fallback for standalone MongoDB
 * - Retry logic for transient errors
 * - Session management
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private supportsTransactions: boolean | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Check if MongoDB supports transactions (requires replica set)
   */
  async checkTransactionSupport(): Promise<boolean> {
    if (this.supportsTransactions !== null) {
      return this.supportsTransactions;
    }

    try {
      // Try to get replica set status
      const admin = this.connection.db?.admin();
      if (!admin) {
        this.supportsTransactions = false;
        return false;
      }

      const status = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
      
      if (status) {
        this.supportsTransactions = true;
        this.logger.log('✅ MongoDB replica set detected - transactions enabled');
      } else {
        // Check if it's MongoDB Atlas (which always supports transactions)
        const serverStatus = await admin.command({ serverStatus: 1 }).catch(() => null);
        const isAtlas = serverStatus?.host?.includes('mongodb.net');
        
        if (isAtlas) {
          this.supportsTransactions = true;
          this.logger.log('✅ MongoDB Atlas detected - transactions enabled');
        } else {
          this.supportsTransactions = false;
          this.logger.warn('⚠️ Standalone MongoDB detected - transactions disabled (requires replica set)');
        }
      }
    } catch (error: any) {
      this.supportsTransactions = false;
      this.logger.warn(`Transaction support check failed: ${error.message}`);
    }

    return this.supportsTransactions;
  }

  /**
   * Execute a function within a MongoDB transaction
   * Falls back to non-transactional execution if transactions not supported
   * 
   * @param fn - Function to execute (receives session if transactions supported)
   * @param options - Transaction options
   * @returns Result of the function
   */
  async withTransaction<T>(
    fn: (session: ClientSession | null) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const supportsTransactions = await this.checkTransactionSupport();

    if (!supportsTransactions) {
      // Execute without transaction
      this.logger.debug('Executing without transaction (not supported)');
      return fn(null);
    }

    const session = await this.connection.startSession();
    
    try {
      let result: T;
      
      await session.withTransaction(async () => {
        result = await fn(session);
      }, {
        readPreference: options?.readPreference || 'primary',
        readConcern: { level: options?.readConcern || 'snapshot' },
        writeConcern: { w: options?.writeConcern || 'majority' },
        maxCommitTimeMS: options?.maxCommitTimeMS || 30000,
      });

      return result!;
    } catch (error: any) {
      // Check for retryable errors
      if (this.isRetryableError(error) && (options?.retries ?? 1) > 0) {
        this.logger.warn(`Retryable transaction error: ${error.message}. Retrying...`);
        return this.withTransaction(fn, {
          ...options,
          retries: (options?.retries ?? 1) - 1,
        });
      }
      
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Start a session for manual transaction control
   */
  async startSession(): Promise<ClientSession | null> {
    const supportsTransactions = await this.checkTransactionSupport();
    
    if (!supportsTransactions) {
      return null;
    }

    return this.connection.startSession();
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // MongoDB transient transaction errors
    if (error.hasErrorLabel?.('TransientTransactionError')) {
      return true;
    }

    // Network errors
    const retryableCodes = [
      6,     // HostUnreachable
      7,     // HostNotFound
      89,    // NetworkTimeout
      91,    // ShutdownInProgress
      189,   // PrimarySteppedDown
      262,   // ExceededTimeLimit
      10107, // NotWritablePrimary
      11600, // InterruptedAtShutdown
      11602, // InterruptedDueToReplStateChange
      13435, // NotPrimaryNoSecondaryOk
      13436, // NotPrimaryOrSecondary
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Execute multiple operations atomically (best effort)
   * Uses transaction if available, otherwise executes sequentially
   */
  async executeAtomic<T>(
    operations: Array<(session: ClientSession | null) => Promise<any>>,
    options?: TransactionOptions,
  ): Promise<T[]> {
    return this.withTransaction(async (session) => {
      const results: T[] = [];
      
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
      
      return results;
    }, options);
  }
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  readPreference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
  readConcern?: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot';
  writeConcern?: 'majority' | number;
  maxCommitTimeMS?: number;
  retries?: number;
}
