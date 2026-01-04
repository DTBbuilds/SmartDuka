import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
import { Order } from '../sales/schemas/order.schema';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel('Order') private orderModel: Model<Order>,
  ) {}

  async clockIn(
    shopId: string,
    cashierId: string,
    cashierName: string,
    openingBalance: number,
  ): Promise<Shift> {
    // Check if cashier already has an open shift
    const existingShift = await this.shiftModel.findOne({
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
      status: 'open',
    });

    if (existingShift) {
      throw new BadRequestException('Cashier already has an open shift');
    }

    const shift = new this.shiftModel({
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
      cashierName,
      startTime: new Date(),
      openingBalance,
      status: 'open',
    });

    return shift.save();
  }

  async clockOut(shiftId: string, shopId: string): Promise<Shift> {
    const shift = await this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'open') {
      throw new BadRequestException('Shift is not open');
    }

    shift.endTime = new Date();
    shift.status = 'closed';
    return shift.save();
  }

  async getCurrentShift(shopId: string, cashierId: string): Promise<Shift | null> {
    return this.shiftModel.findOne({
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
      status: 'open',
    });
  }

  async getShiftSalesData(shiftId: string, shopId: string): Promise<{
    totalSales: number;
    transactionCount: number;
    expectedCash: number;
  }> {
    const shift = await this.getShiftById(shiftId, shopId);
    if (!shift) {
      return { totalSales: 0, transactionCount: 0, expectedCash: 0 };
    }

    const sales = await this.orderModel.aggregate([
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          shiftId: new Types.ObjectId(shiftId),
          status: { $in: ['completed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const shiftSales = sales.length > 0 ? sales[0] : { totalSales: 0, transactionCount: 0 };
    const expectedCash = shift.openingBalance + shiftSales.totalSales;

    return {
      totalSales: shiftSales.totalSales,
      transactionCount: shiftSales.transactionCount,
      expectedCash,
    };
  }

  async getShiftById(shiftId: string, shopId: string): Promise<Shift | null> {
    return this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
    });
  }

  async reconcileShift(
    shiftId: string,
    shopId: string,
    actualCash: number,
    reconciliedBy: string,
    notes?: string,
  ): Promise<Shift> {
    const shift = await this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'closed') {
      throw new BadRequestException('Shift must be closed before reconciliation');
    }

    // Calculate actual sales from orders during this shift
    const sales = await this.orderModel.aggregate([
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          shiftId: new Types.ObjectId(shiftId),
          status: { $in: ['completed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const shiftSales = sales.length > 0 ? sales[0] : { totalSales: 0, transactionCount: 0 };
    const expectedCash = shift.openingBalance + shiftSales.totalSales;
    const variance = actualCash - expectedCash;

    shift.actualCash = actualCash;
    shift.expectedCash = expectedCash;
    shift.variance = variance;
    shift.totalSales = shiftSales.totalSales;
    shift.transactionCount = shiftSales.transactionCount;
    shift.status = 'reconciled';
    shift.reconciliedBy = new Types.ObjectId(reconciliedBy);
    shift.reconciliedAt = new Date();
    shift.notes = notes;

    return shift.save();
  }

  async getShiftHistory(
    shopId: string,
    cashierId?: string,
    limit: number = 10,
  ): Promise<Shift[]> {
    const query: any = {
      shopId: new Types.ObjectId(shopId),
    };

    if (cashierId) {
      query.cashierId = new Types.ObjectId(cashierId);
    }

    return this.shiftModel
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .exec();
  }

  async getShiftsByStatus(
    shopId: string,
    status: 'open' | 'closed' | 'reconciled',
  ): Promise<Shift[]> {
    return this.shiftModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status,
      })
      .sort({ startTime: -1 })
      .exec();
  }

  async getShiftDuration(shift: Shift): Promise<number> {
    if (!shift.endTime) {
      return Date.now() - new Date(shift.startTime).getTime();
    }
    return new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
  }

  async formatDuration(milliseconds: number): Promise<string> {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Record activity ping from cashier frontend
   * This is called periodically to track active working time
   */
  async recordActivityPing(
    shiftId: string,
    shopId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; activeTimeMs: number; inactiveTimeMs: number }> {
    const shift = await this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
      status: 'open',
    });

    if (!shift) {
      return { success: false, activeTimeMs: 0, inactiveTimeMs: 0 };
    }

    const now = new Date();
    const lastActivity = shift.lastActivityAt || shift.startTime;
    const timeSinceLastPing = now.getTime() - new Date(lastActivity).getTime();

    // Cap the time delta to prevent huge jumps (max 5 minutes per ping)
    const cappedTimeDelta = Math.min(timeSinceLastPing, 5 * 60 * 1000);

    if (isActive) {
      shift.activeTimeMs = (shift.activeTimeMs || 0) + cappedTimeDelta;
    } else {
      shift.inactiveTimeMs = (shift.inactiveTimeMs || 0) + cappedTimeDelta;
    }

    shift.lastActivityAt = now;
    shift.activityPingCount = (shift.activityPingCount || 0) + 1;

    await shift.save();

    return {
      success: true,
      activeTimeMs: shift.activeTimeMs || 0,
      inactiveTimeMs: shift.inactiveTimeMs || 0,
    };
  }

  /**
   * Record a break period for the cashier
   */
  async recordBreak(
    shiftId: string,
    shopId: string,
    reason?: string,
  ): Promise<Shift> {
    const shift = await this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
      status: 'open',
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const now = new Date();

    // Close any open activity period
    if (shift.activityPeriods && shift.activityPeriods.length > 0) {
      const lastPeriod = shift.activityPeriods[shift.activityPeriods.length - 1];
      if (!lastPeriod.endTime) {
        lastPeriod.endTime = now;
      }
    }

    // Start a break period
    shift.activityPeriods = shift.activityPeriods || [];
    shift.activityPeriods.push({
      startTime: now,
      type: 'break',
      reason: reason || 'Break',
    });

    shift.lastActivityAt = now;
    return shift.save();
  }

  /**
   * End a break period
   */
  async endBreak(shiftId: string, shopId: string): Promise<Shift> {
    const shift = await this.shiftModel.findOne({
      _id: new Types.ObjectId(shiftId),
      shopId: new Types.ObjectId(shopId),
      status: 'open',
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const now = new Date();

    // Find and close the open break period
    if (shift.activityPeriods && shift.activityPeriods.length > 0) {
      const lastPeriod = shift.activityPeriods[shift.activityPeriods.length - 1];
      if (lastPeriod.type === 'break' && !lastPeriod.endTime) {
        lastPeriod.endTime = now;
        const breakDuration = now.getTime() - new Date(lastPeriod.startTime).getTime();
        shift.breakTimeMs = (shift.breakTimeMs || 0) + breakDuration;
      }
    }

    // Start a new active period
    shift.activityPeriods.push({
      startTime: now,
      type: 'active',
    });

    shift.lastActivityAt = now;
    return shift.save();
  }

  /**
   * Get shift statistics with activity breakdown
   */
  async getShiftStats(shiftId: string, shopId: string): Promise<{
    totalDurationMs: number;
    activeTimeMs: number;
    inactiveTimeMs: number;
    breakTimeMs: number;
    activePercentage: number;
    totalSales: number;
    transactionCount: number;
    averageTransactionValue: number;
    salesPerActiveHour: number;
  }> {
    const shift = await this.getShiftById(shiftId, shopId);
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const salesData = await this.getShiftSalesData(shiftId, shopId);
    const totalDurationMs = await this.getShiftDuration(shift);

    const activeTimeMs = shift.activeTimeMs || 0;
    const inactiveTimeMs = shift.inactiveTimeMs || 0;
    const breakTimeMs = shift.breakTimeMs || 0;

    // Calculate active percentage
    const trackedTime = activeTimeMs + inactiveTimeMs + breakTimeMs;
    const activePercentage = trackedTime > 0 
      ? Math.round((activeTimeMs / trackedTime) * 100) 
      : 100; // Default to 100% if no tracking data

    // Calculate sales per active hour
    const activeHours = activeTimeMs / (1000 * 60 * 60);
    const salesPerActiveHour = activeHours > 0 
      ? Math.round(salesData.totalSales / activeHours) 
      : 0;

    // Average transaction value
    const averageTransactionValue = salesData.transactionCount > 0
      ? Math.round(salesData.totalSales / salesData.transactionCount)
      : 0;

    return {
      totalDurationMs,
      activeTimeMs,
      inactiveTimeMs,
      breakTimeMs,
      activePercentage,
      totalSales: salesData.totalSales,
      transactionCount: salesData.transactionCount,
      averageTransactionValue,
      salesPerActiveHour,
    };
  }

  /**
   * Get all shifts for a cashier with activity data (for admin view)
   */
  async getCashierShiftSummary(
    shopId: string,
    cashierId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalShifts: number;
    totalActiveTimeMs: number;
    totalInactiveTimeMs: number;
    totalBreakTimeMs: number;
    totalSales: number;
    totalTransactions: number;
    averageActivePercentage: number;
    shifts: Shift[];
  }> {
    const query: any = {
      shopId: new Types.ObjectId(shopId),
      cashierId: new Types.ObjectId(cashierId),
    };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = startDate;
      if (endDate) query.startTime.$lte = endDate;
    }

    const shifts = await this.shiftModel
      .find(query)
      .sort({ startTime: -1 })
      .limit(50)
      .exec();

    let totalActiveTimeMs = 0;
    let totalInactiveTimeMs = 0;
    let totalBreakTimeMs = 0;
    let totalSales = 0;
    let totalTransactions = 0;

    for (const shift of shifts) {
      totalActiveTimeMs += shift.activeTimeMs || 0;
      totalInactiveTimeMs += shift.inactiveTimeMs || 0;
      totalBreakTimeMs += shift.breakTimeMs || 0;
      totalSales += shift.totalSales || 0;
      totalTransactions += shift.transactionCount || 0;
    }

    const totalTrackedTime = totalActiveTimeMs + totalInactiveTimeMs + totalBreakTimeMs;
    const averageActivePercentage = totalTrackedTime > 0
      ? Math.round((totalActiveTimeMs / totalTrackedTime) * 100)
      : 100;

    return {
      totalShifts: shifts.length,
      totalActiveTimeMs,
      totalInactiveTimeMs,
      totalBreakTimeMs,
      totalSales,
      totalTransactions,
      averageActivePercentage,
      shifts,
    };
  }
}
