import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { TokenService } from './auth/token.service';
import { OtpService } from './auth/services/otp.service';
import { PinAttemptService } from './auth/services/pin-attempt.service';
import { AuthService } from './auth/auth.service';
import { ShopsService } from './shops/shops.service';
import { JwtService } from '@nestjs/jwt';
import { ShopSettingsService } from './shop-settings/shop-settings.service';
import { ShiftsService } from './shifts/shifts.service';
import { SalesController } from './sales/sales.controller';
import { SalesService } from './sales/sales.service';
import { ReceiptService } from './sales/services/receipt.service';
import { InvoiceService } from './sales/services/invoice.service';
import { ReturnsController } from './returns/returns.controller';
import { ReturnsService } from './returns/returns.service';
import { TransactionControlsService } from './sales/transaction-controls.service';
import { InventoryService } from './inventory/inventory.service';

/**
 * CASHIER-P0 — NEGATIVE AUTHORIZATION SHIELD
 *
 * Proves the Phase B/C corrections REJECT what they must reject:
 *   F-04  user records are not world-readable; PIN hash never leaves
 *   F-05  disable/delete burns sessions; refresh refuses disabled users
 *   F-10  returns are tenant-scoped; approver identity comes from the JWT
 *   F-11  shift ownership enforced; admin override explicit
 *   F-16  branch reads are branch-authorized server-side
 *   F-17  PIN attempt limiting cannot be bypassed by varying the PIN
 */

const SHOP_A = '507f1f77bcf86cd799439011';
const SHOP_B = '507f1f77bcf86cd799439099';
const ADMIN_A = '507f1f77bcf86cd7994390a1';
const CASHIER_A = '507f1f77bcf86cd7994390a2';
const CASHIER_B = '507f1f77bcf86cd7994390a3';

describe('CASHIER-P0 negative authorization', () => {
  // ─────────────────────────── F-04 ───────────────────────────
  describe('F-04 GET /users/:id is authenticated, tenant-scoped, hash-free', () => {
    let controller: UsersController;
    let usersService: { findById: jest.Mock };

    beforeEach(async () => {
      usersService = {
        findById: jest.fn(async (id: string) => ({
          _id: id,
          shopId: SHOP_A,
          toObject: () => ({
            _id: id,
            shopId: SHOP_A,
            name: 'Cashier A',
            email: 'a@x.com',
            passwordHash: 'SECRET-PW-HASH',
            pinHash: 'SECRET-PIN-HASH',
            role: 'cashier',
          }),
        })),
      };
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: usersService },
          {
            provide: TokenService,
            useValue: { revokeAllUserTokens: jest.fn() },
          },
          { provide: OtpService, useValue: {} },
        ],
      }).compile();
      controller = module.get<UsersController>(UsersController);
    });

    it('rejects a caller with no identity (defense in depth behind the guard)', async () => {
      await expect(
        controller.findById(CASHIER_A, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a cashier cannot read another user record', async () => {
      await expect(
        controller.findById(CASHIER_B, {
          sub: CASHIER_A,
          role: 'cashier',
          shopId: SHOP_A,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('self-read is allowed for a cashier and strips BOTH password and PIN hashes', async () => {
      const result: any = await controller.findById(CASHIER_A, {
        sub: CASHIER_A,
        role: 'cashier',
        shopId: SHOP_A,
      });
      expect(result.name).toBe('Cashier A');
      expect(result.passwordHash).toBeUndefined();
      expect(result.pinHash).toBeUndefined();
    });

    it('staff can read within their own shop', async () => {
      const result: any = await controller.findById(CASHIER_A, {
        sub: ADMIN_A,
        role: 'admin',
        shopId: SHOP_A,
      });
      expect(result._id).toBe(CASHIER_A);
      expect(result.pinHash).toBeUndefined();
    });

    it('staff cannot read across shops', async () => {
      await expect(
        controller.findById(CASHIER_A, {
          sub: ADMIN_A,
          role: 'admin',
          shopId: SHOP_B,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────── F-05 ───────────────────────────
  describe('F-05 disable/delete revokes sessions; refresh refuses disabled users', () => {
    let controller: UsersController;
    let revokeAllUserTokens: jest.Mock;
    let usersService: any;

    beforeEach(async () => {
      revokeAllUserTokens = jest.fn().mockResolvedValue(2);
      usersService = {
        findById: jest.fn(async (id: string) => ({
          _id: id,
          shopId: { toString: () => SHOP_A },
          role: 'cashier',
          toObject: () => ({ _id: id, status: 'disabled' }),
        })),
        updateStatus: jest.fn(async () => ({
          toObject: () => ({ _id: CASHIER_A, status: 'disabled' }),
        })),
        deleteUser: jest.fn(async () => ({ deleted: true })),
      };
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: usersService },
          { provide: TokenService, useValue: { revokeAllUserTokens } },
          { provide: OtpService, useValue: {} },
        ],
      }).compile();
      controller = module.get<UsersController>(UsersController);
    });

    it('disabling a cashier revokes all their tokens/sessions', async () => {
      await controller.updateUserStatus(
        CASHIER_A,
        { status: 'disabled' },
        { shopId: SHOP_A, email: 'admin@a' },
      );
      expect(revokeAllUserTokens).toHaveBeenCalledWith(
        CASHIER_A,
        expect.stringContaining('disabled'),
      );
    });

    it('re-enabling does not burn tokens', async () => {
      await controller.updateUserStatus(
        CASHIER_A,
        { status: 'active' },
        { shopId: SHOP_A, email: 'admin@a' },
      );
      expect(revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('deleting a cashier revokes all their tokens/sessions', async () => {
      await controller.deleteUser(CASHIER_A, {
        shopId: SHOP_A,
        email: 'admin@a',
      });
      expect(revokeAllUserTokens).toHaveBeenCalledWith(
        CASHIER_A,
        expect.stringContaining('deleted'),
      );
    });

    it('refresh with a DISABLED user is refused and burns remaining tokens', async () => {
      const isSessionActive = jest.fn().mockResolvedValue(true);
      const getSessionById = jest
        .fn()
        .mockResolvedValue({ userId: CASHIER_A, shopId: SHOP_A });
      const refreshAccessToken = jest
        .fn()
        .mockResolvedValue({ sessionId: 'sess-1' });
      const usersFindById = jest
        .fn()
        .mockResolvedValue({ _id: CASHIER_A, status: 'disabled' });

      const authService = new AuthService(
        { findById: usersFindById } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {
          isSessionActive,
          getSessionById,
          refreshAccessToken,
          revokeAllUserTokens,
        } as any,
      );

      await expect(
        (authService as any).refreshTokenWithRotation('rt', {}),
      ).rejects.toThrow(UnauthorizedException);
      expect(revokeAllUserTokens).toHaveBeenCalledWith(
        CASHIER_A,
        expect.any(String),
      );
    });
  });

  // ─────────────────────────── F-10 ───────────────────────────
  describe('F-10 returns are tenant-scoped with JWT-derived approvers', () => {
    let controller: ReturnsController;
    let returnsService: any;

    beforeEach(async () => {
      returnsService = {
        createReturn: jest.fn(async (_shop, _dto, requestedBy) => ({
          requestedBy,
        })),
        findByIdForShop: jest.fn(async () => null),
        approveReturn: jest.fn(async (_shop, _id, approvedBy) => ({
          approvedBy,
        })),
      };
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ReturnsController],
        providers: [{ provide: ReturnsService, useValue: returnsService }],
      }).compile();
      controller = module.get<ReturnsController>(ReturnsController);
    });

    it('requestedBy comes from the JWT, never the body', async () => {
      const result: any = await controller.createReturn(
        {
          orderId: 'o1',
          orderDate: new Date(),
          items: [],
          requestedBy: 'ATTACKER',
        },
        { shopId: SHOP_A, sub: CASHIER_A },
      );
      expect(returnsService.createReturn).toHaveBeenCalledWith(
        SHOP_A,
        expect.anything(),
        CASHIER_A,
      );
      expect(result.requestedBy).toBe(CASHIER_A);
    });

    it('approver comes from the JWT, never the body', async () => {
      const result: any = await controller.approveReturn(
        'r1',
        { approvedBy: 'ATTACKER', approvalNotes: 'x' },
        { shopId: SHOP_A, sub: ADMIN_A, role: 'admin' },
      );
      expect(returnsService.approveReturn).toHaveBeenCalledWith(
        SHOP_A,
        'r1',
        ADMIN_A,
        'x',
      );
      expect(result.approvedBy).toBe(ADMIN_A);
    });

    it('single-return reads are shop-scoped (findByIdForShop, not raw findById)', async () => {
      await controller.findById('r1', { shopId: SHOP_A });
      expect(returnsService.findByIdForShop).toHaveBeenCalledWith(SHOP_A, 'r1');
    });
  });

  // ─────────────────────────── F-11 ───────────────────────────
  describe('F-11 shift ownership with explicit admin override', () => {
    let service: ShiftsService;
    let shiftModel: any;
    let ownerShift: any;
    const SHIFT_ID = '507f1f77bcf86cd7994390e1';

    beforeEach(() => {
      ownerShift = {
        _id: SHIFT_ID,
        shopId: SHOP_A,
        cashierId: CASHIER_A,
        status: 'open',
        startTime: new Date(),
        save: jest.fn(async function (this: any) {
          return this;
        }),
      };
      shiftModel = {
        findOne: jest.fn().mockResolvedValue(ownerShift),
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      service = new ShiftsService(shiftModel, {
        aggregate: jest.fn().mockResolvedValue([]),
      } as any);
    });

    it('a cashier cannot clock out another cashier’s shift', async () => {
      await expect(
        service.clockOut(SHIFT_ID, SHOP_A, CASHIER_B, 'cashier'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('the shift owner can clock out their own shift', async () => {
      const shift = await service.clockOut(
        SHIFT_ID,
        SHOP_A,
        CASHIER_A,
        'cashier',
      );
      expect(shift.status).toBe('closed');
    });

    it('an admin override may clock out any shift in the shop', async () => {
      const shift = await service.clockOut(SHIFT_ID, SHOP_A, ADMIN_A, 'admin');
      expect(shift.status).toBe('closed');
    });

    it('a cashier cannot reconcile another cashier’s shift', async () => {
      ownerShift.status = 'closed';
      await expect(
        service.reconcileShift(
          SHIFT_ID,
          SHOP_A,
          100,
          CASHIER_B,
          undefined,
          'cashier',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('an admin may reconcile any shift in the shop', async () => {
      ownerShift.status = 'closed';
      const shift = await service.reconcileShift(
        SHIFT_ID,
        SHOP_A,
        100,
        ADMIN_A,
        undefined,
        'admin',
      );
      expect(shift.status).toBe('reconciled');
    });

    it('shift history is forced to the caller’s own cashierId for cashiers', async () => {
      await service.getShiftHistory(
        SHOP_A,
        CASHIER_B,
        10,
        CASHIER_A,
        'cashier',
      );
      const query = shiftModel.find.mock.calls[0][0];
      expect(query.cashierId.toString()).toBe(CASHIER_A);
    });

    it('activity pings from a non-owner are ignored', async () => {
      const result = await service.recordActivityPing(
        SHIFT_ID,
        SHOP_A,
        true,
        CASHIER_B,
      );
      expect(result.success).toBe(false);
    });
  });

  // ─────────────────────────── F-16 ───────────────────────────
  describe('F-16 branch reads are branch-authorized', () => {
    let controller: SalesController;
    let salesService: { listOrdersByBranch: jest.Mock };
    let branchModel: any;

    beforeEach(async () => {
      salesService = { listOrdersByBranch: jest.fn().mockResolvedValue([]) };
      branchModel = {
        findOne: jest.fn().mockImplementation((q: any) => ({
          lean: () => ({
            exec: async () =>
              q.shopId.toString() === SHOP_A
                ? { _id: q._id, shopId: q.shopId }
                : null,
          }),
        })),
      };
      const module: TestingModule = await Test.createTestingModule({
        controllers: [SalesController],
        providers: [
          { provide: SalesService, useValue: salesService },
          { provide: ReceiptService, useValue: {} },
          { provide: InvoiceService, useValue: {} },
          { provide: getModelToken('Branch'), useValue: branchModel },
          { provide: InventoryService, useValue: {} },
          { provide: TransactionControlsService, useValue: {} },
          { provide: ShiftsService, useValue: { getShiftById: jest.fn() } },
        ],
      }).compile();
      controller = module.get<SalesController>(SalesController);
    });

    it('a cashier can read their OWN branch orders', async () => {
      await controller.listOrdersByBranch(
        '507f1f77bcf86cd7994390c1',
        {},
        {
          shopId: SHOP_A,
          sub: CASHIER_A,
          role: 'cashier',
          branchId: '507f1f77bcf86cd7994390c1',
        },
      );
      expect(salesService.listOrdersByBranch).toHaveBeenCalled();
    });

    it('a cashier cannot read ANOTHER branch’s orders', async () => {
      await expect(
        controller.listOrdersByBranch('507f1f77bcf86cd7994390c2', {} as any, {
          shopId: SHOP_A,
          sub: CASHIER_A,
          role: 'cashier',
          branchId: '507f1f77bcf86cd7994390c1',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(salesService.listOrdersByBranch).not.toHaveBeenCalled();
    });

    it('a branch of another shop is invisible (tenant boundary)', async () => {
      await expect(
        controller.listOrdersByBranch('507f1f77bcf86cd7994390c1', {} as any, {
          shopId: SHOP_B,
          sub: CASHIER_A,
          role: 'cashier',
          branchId: '507f1f77bcf86cd7994390c1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('an admin may read any branch within their shop', async () => {
      await controller.listOrdersByBranch(
        '507f1f77bcf86cd7994390c2',
        {},
        { shopId: SHOP_A, sub: ADMIN_A, role: 'admin' },
      );
      expect(salesService.listOrdersByBranch).toHaveBeenCalled();
    });

    it('a branch_admin assigned to the branch may read it; unassigned may not', async () => {
      await controller.listOrdersByBranch(
        '507f1f77bcf86cd7994390c1',
        {},
        {
          shopId: SHOP_A,
          sub: 'ba1',
          role: 'branch_admin',
          branches: ['507f1f77bcf86cd7994390c1'],
        },
      );
      await expect(
        controller.listOrdersByBranch('507f1f77bcf86cd7994390c2', {} as any, {
          shopId: SHOP_A,
          sub: 'ba1',
          role: 'branch_admin',
          branches: ['507f1f77bcf86cd7994390c1'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────── F-17 ───────────────────────────
  describe('F-17 PIN attempt limiting resists PIN variation', () => {
    let service: PinAttemptService;

    beforeEach(() => {
      service = new PinAttemptService();
    });

    it('locks after MAX failures for the same shop+IP regardless of attempted PIN', () => {
      const ip = '1.2.3.4';
      // Varying the attempted PIN must not matter — the service is not keyed
      // by PIN at all; every failure counts against the shop+IP.
      for (let i = 0; i < 5; i++) {
        expect(() => service.assertAllowed(SHOP_A, ip)).not.toThrow();
        service.recordFailure(SHOP_A, ip);
      }
      expect(() => service.assertAllowed(SHOP_A, ip)).toThrow(HttpException);
    });

    it('a successful verification clears the counter (shared-device fairness)', () => {
      const ip = '2.3.4.5';
      for (let i = 0; i < 4; i++) service.recordFailure(SHOP_A, ip);
      service.recordSuccess(SHOP_A, ip);
      expect(() => service.assertAllowed(SHOP_A, ip)).not.toThrow();
    });

    it('a different IP is not punished for another IP’s failures', () => {
      for (let i = 0; i < 5; i++) service.recordFailure(SHOP_A, '9.9.9.9');
      expect(() => service.assertAllowed(SHOP_A, '8.8.8.8')).not.toThrow();
    });

    it('a different shop is not punished for another shop’s failures', () => {
      for (let i = 0; i < 5; i++) service.recordFailure(SHOP_A, '9.9.9.9');
      expect(() => service.assertAllowed(SHOP_B, '9.9.9.9')).not.toThrow();
    });

    it('GATE1: rotating IPs cannot bypass the shop-wide aggregate lock', () => {
      // Each fresh IP stays under the per-IP threshold, but the aggregate
      // across all identities trips the shop-wide lock.
      for (let i = 0; i < 30; i++) {
        const ip = `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`;
        expect(() => service.assertAllowed(SHOP_A, ip)).not.toThrow();
        service.recordFailure(SHOP_A, ip);
      }
      expect(() => service.assertAllowed(SHOP_A, '10.0.9.9')).toThrow(
        HttpException,
      );
      // A different shop is unaffected by SHOP_A's aggregate lock.
      expect(() => service.assertAllowed(SHOP_B, '10.0.9.9')).not.toThrow();
    });

    it('GATE1: legitimate shared-device traffic erodes the shop-wide counter', () => {
      // 29 attacker failures from rotating IPs, then legitimate successes —
      // the counter erodes and a fresh failure burst does not lock the shop.
      for (let i = 0; i < 29; i++) {
        service.recordFailure(SHOP_A, `10.1.0.${i + 1}`);
      }
      for (let i = 0; i < 29; i++) {
        service.recordSuccess(SHOP_A, `10.2.0.${i + 1}`);
      }
      expect(() => service.assertAllowed(SHOP_A, '10.3.0.1')).not.toThrow();
    });
  });
});
