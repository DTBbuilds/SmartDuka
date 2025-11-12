import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Discount, DiscountDocument } from './schemas/discount.schema';
import { DiscountAudit, DiscountAuditDocument } from './schemas/discount-audit.schema';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(
    @InjectModel(Discount.name) private discountModel: Model<DiscountDocument>,
    @InjectModel(DiscountAudit.name) private auditModel: Model<DiscountAuditDocument>,
  ) {}

  async create(shopId: string, dto: CreateDiscountDto): Promise<Discount> {
    const discount = new this.discountModel({
      shopId: new Types.ObjectId(shopId),
      ...dto,
    });
    return discount.save();
  }

  async findAll(shopId: string, status?: string): Promise<Discount[]> {
    const filter: any = { shopId: new Types.ObjectId(shopId) };
    if (status) {
      filter.status = status;
    }
    return this.discountModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Discount | null> {
    return this.discountModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateDiscountDto): Promise<Discount | null> {
    return this.discountModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Discount | null> {
    return this.discountModel.findByIdAndDelete(id).exec();
  }

  async validateDiscount(
    shopId: string,
    discountId: string,
    subtotal: number,
    customerId?: string,
    customerSegment?: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const discount = await this.findById(discountId);

    if (!discount) {
      return { valid: false, reason: 'Discount not found' };
    }

    if (discount.shopId.toString() !== shopId) {
      return { valid: false, reason: 'Discount not available for this shop' };
    }

    if (discount.status !== 'active') {
      return { valid: false, reason: 'Discount is inactive' };
    }

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return { valid: false, reason: 'Discount usage limit reached' };
    }

    // Check validity period
    const now = new Date();
    if (now < discount.rules.validFrom || now > discount.rules.validTo) {
      return { valid: false, reason: 'Discount is not valid at this time' };
    }

    // Check minimum purchase amount
    if (discount.rules.minPurchaseAmount && subtotal < discount.rules.minPurchaseAmount) {
      return {
        valid: false,
        reason: `Minimum purchase amount is Ksh ${discount.rules.minPurchaseAmount}`,
      };
    }

    // Check customer segment
    if (
      discount.rules.customerSegments &&
      discount.rules.customerSegments.length > 0 &&
      customerSegment &&
      !discount.rules.customerSegments.includes(customerSegment)
    ) {
      return { valid: false, reason: 'Discount not available for your customer segment' };
    }

    // Check applicable day
    if (discount.rules.applicableDays && discount.rules.applicableDays.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = dayNames[now.getDay()];
      if (!discount.rules.applicableDays.includes(currentDay)) {
        return { valid: false, reason: 'Discount not available on this day' };
      }
    }

    // Check applicable hours
    if (discount.rules.applicableHours) {
      const currentHour = now.getHours();
      if (
        currentHour < discount.rules.applicableHours.start ||
        currentHour >= discount.rules.applicableHours.end
      ) {
        return { valid: false, reason: 'Discount not available at this time' };
      }
    }

    return { valid: true };
  }

  async calculateDiscountAmount(
    discountId: string,
    subtotal: number,
    itemCount?: number,
  ): Promise<number> {
    const discount = await this.findById(discountId);
    if (!discount) return 0;

    let amount = 0;

    switch (discount.type) {
      case 'percentage':
        amount = Math.round((subtotal * discount.value) / 100);
        break;

      case 'fixed':
        amount = discount.value;
        break;

      case 'bogo':
        // Buy One Get One: 50% off second item
        // Simplified: 50% off if buying 2+ items
        if (itemCount && itemCount >= 2) {
          amount = Math.round(subtotal * 0.5);
        }
        break;

      case 'tiered':
        // Tiered discount based on quantity/amount
        // value represents the discount percentage for tier
        if (subtotal >= (discount.rules.minPurchaseAmount ?? 0)) {
          amount = Math.round((subtotal * discount.value) / 100);
        }
        break;

      case 'coupon':
        // Coupon: fixed amount
        amount = discount.value;
        break;
    }

    // Apply max discount limit
    if (discount.rules.maxDiscountAmount) {
      amount = Math.min(amount, discount.rules.maxDiscountAmount);
    }

    // Ensure discount doesn't exceed subtotal
    amount = Math.min(amount, subtotal);

    return amount;
  }

  async applyDiscount(
    shopId: string,
    dto: ApplyDiscountDto,
  ): Promise<{
    discountAmount: number;
    discountId: string;
    discountName: string;
  }> {
    // Validate discount
    const validation = await this.validateDiscount(
      shopId,
      dto.discountId,
      dto.subtotal,
      dto.customerId,
      dto.customerSegment,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.reason || 'Discount validation failed');
    }

    // Calculate discount amount
    const discountAmount = await this.calculateDiscountAmount(
      dto.discountId,
      dto.subtotal,
      dto.itemCount,
    );

    // Check if approval is required
    const discount = await this.findById(dto.discountId);
    if (!discount) {
      throw new BadRequestException('Discount not found');
    }

    if (discount.requiresApproval && discountAmount > 500) {
      // Create pending audit record
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        discountId: new Types.ObjectId(dto.discountId),
        orderId: new Types.ObjectId(dto.orderId),
        amount: discountAmount,
        appliedBy: new Types.ObjectId(dto.appliedBy),
        reason: dto.reason,
        status: 'pending',
      });

      throw new BadRequestException(
        'Discount requires manager approval. Request submitted for approval.',
      );
    }

    // Create audit record
    await this.auditModel.create({
      shopId: new Types.ObjectId(shopId),
      discountId: new Types.ObjectId(dto.discountId),
      orderId: new Types.ObjectId(dto.orderId),
      amount: discountAmount,
      appliedBy: new Types.ObjectId(dto.appliedBy),
      reason: dto.reason,
      status: 'approved',
    });

    // Increment usage count
    await this.discountModel.findByIdAndUpdate(
      dto.discountId,
      { $inc: { usageCount: 1 } },
      { new: true },
    );

    return {
      discountAmount,
      discountId: dto.discountId,
      discountName: discount.name,
    };
  }

  async getAuditLog(
    shopId: string,
    filters?: {
      discountId?: string;
      appliedBy?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<DiscountAudit[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.discountId) {
      query.discountId = new Types.ObjectId(filters.discountId);
    }

    if (filters?.appliedBy) {
      query.appliedBy = new Types.ObjectId(filters.appliedBy);
    }

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    return this.auditModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async approveDiscount(auditId: string, approvedBy: string): Promise<DiscountAudit | null> {
    return this.auditModel
      .findByIdAndUpdate(
        auditId,
        {
          status: 'approved',
          approvedBy: new Types.ObjectId(approvedBy),
        },
        { new: true },
      )
      .exec();
  }

  async rejectDiscount(auditId: string, approvedBy: string): Promise<DiscountAudit | null> {
    return this.auditModel
      .findByIdAndUpdate(
        auditId,
        {
          status: 'rejected',
          approvedBy: new Types.ObjectId(approvedBy),
        },
        { new: true },
      )
      .exec();
  }
}
