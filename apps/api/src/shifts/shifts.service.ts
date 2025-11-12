import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
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

    const expectedCash = shift.openingBalance;
    const variance = actualCash - expectedCash;

    shift.actualCash = actualCash;
    shift.expectedCash = expectedCash;
    shift.variance = variance;
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
}
