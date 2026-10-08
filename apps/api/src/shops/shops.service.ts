import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './schemas/shop.schema';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { generateShopId } from './utils/shop-id-generator';

export type { CreateShopDto, UpdateShopDto };

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
  ) {}

  async create(ownerId: string, dto: CreateShopDto): Promise<ShopDocument> {
    // Check if shop email already exists
    const existingEmail = await this.shopModel.findOne({ email: dto.email });
    if (existingEmail) {
      throw new BadRequestException('Shop email already registered');
    }

    // Check if shop phone already exists
    const existingPhone = await this.shopModel.findOne({ phone: dto.phone });
    if (existingPhone) {
      throw new BadRequestException('Shop phone number already registered');
    }

    try {
      // Get the count of existing shops to generate sequential shop ID
      const shopCount = await this.shopModel.countDocuments();
      const sequenceNumber = shopCount + 1;
      const shopId = generateShopId(sequenceNumber);

      // Normalize kraPin: convert empty/whitespace to undefined for sparse unique index
      // The sparse index only ignores null/undefined, NOT empty strings
      let normalizedKraPin: string | undefined = undefined;
      if (dto.kraPin && typeof dto.kraPin === 'string') {
        const trimmed = dto.kraPin.trim().toUpperCase();
        if (trimmed.length > 0) {
          normalizedKraPin = trimmed;
        }
      }

      // P0-11B: explicit allowlist — no property spread of caller input.
      // status is SERVER-OWNED ('pending'); privileged counters are
      // server-initialized; unknown fields can never reach MongoDB.
      const shopData: any = {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        businessType: dto.businessType,
        country: dto.country,
        county: dto.county,
        city: dto.city,
        currency: dto.currency,
        shopId, // Add human-readable shop ID
        ownerId: ownerId ? new Types.ObjectId(ownerId) : undefined,
        language: dto.language === 'sw' ? 'sw' : 'en',
        status: 'pending',
        cashierCount: 0,
        totalSales: 0,
        totalOrders: 0,
        onboardingComplete: false,
      };
      if (dto.address !== undefined) shopData.address = dto.address;
      if (dto.description !== undefined) shopData.description = dto.description;
      if (dto.tillNumber !== undefined) shopData.tillNumber = dto.tillNumber;

      // Only add kraPin if it has a valid value
      if (normalizedKraPin) {
        shopData.kraPin = normalizedKraPin;
      }

      const shop = new this.shopModel(shopData);
      return await shop.save();
    } catch (error: any) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'email') {
          throw new BadRequestException('Shop email already registered');
        } else if (field === 'phone') {
          throw new BadRequestException('Shop phone number already registered');
        } else if (field === 'shopId') {
          throw new BadRequestException(
            'Shop ID generation conflict, please try again',
          );
        } else {
          throw new BadRequestException(`${field} already registered`);
        }
      }
      throw error;
    }
  }

  async findById(shopId: string): Promise<ShopDocument | null> {
    return this.shopModel.findById(new Types.ObjectId(shopId)).exec();
  }

  async findByOwner(ownerId: string): Promise<ShopDocument | null> {
    return this.shopModel
      .findOne({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
  }

  async update(
    shopId: string,
    dto: UpdateShopDto,
  ): Promise<ShopDocument | null> {
    try {
      // P0-11B DEFENSE-IN-DEPTH ALLOWLIST — the update document is built from
      // known mutable properties ONLY. No spread of caller input: even if a
      // DTO were ever bypassed, privileged fields (status, verification*,
      // ownerId, cashierCount, totalSales, totalOrders, onboardingComplete)
      // and unknown properties can never reach MongoDB through this path.
      // kraPin keeps its normalize/unset semantics (sparse unique index).
      const updateData: any = { updatedAt: new Date() };
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.email !== undefined) updateData.email = dto.email;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.county !== undefined) updateData.county = dto.county;
      if (dto.city !== undefined) updateData.city = dto.city;
      if (dto.country !== undefined) updateData.country = dto.country;
      if (dto.businessType !== undefined)
        updateData.businessType = dto.businessType;
      if (dto.currency !== undefined) updateData.currency = dto.currency;
      if (dto.tillNumber !== undefined) updateData.tillNumber = dto.tillNumber;
      if (dto.description !== undefined)
        updateData.description = dto.description;

      // Handle kraPin separately - only update if explicitly provided
      if (dto.kraPin !== undefined) {
        if (dto.kraPin && typeof dto.kraPin === 'string') {
          const trimmed = dto.kraPin.trim().toUpperCase();
          if (trimmed.length > 0) {
            updateData.kraPin = trimmed;
          } else {
            // Explicitly unset kraPin if empty string provided
            updateData.$unset = { kraPin: 1 };
          }
        } else {
          // Explicitly unset kraPin if null provided
          updateData.$unset = { kraPin: 1 };
        }
      }

      return await this.shopModel
        .findByIdAndUpdate(new Types.ObjectId(shopId), updateData, {
          new: true,
          runValidators: true,
        })
        .exec();
    } catch (error: any) {
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'email') {
          throw new BadRequestException('Shop email already registered');
        } else if (field === 'phone') {
          throw new BadRequestException('Shop phone number already registered');
        } else if (field === 'kraPin') {
          throw new BadRequestException(
            'KRA PIN already registered to another shop',
          );
        } else {
          throw new BadRequestException(`${field} already registered`);
        }
      }
      throw error;
    }
  }

  async completeOnboarding(shopId: string): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        { onboardingComplete: true, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async updateSettings(
    shopId: string,
    settings: Record<string, any>,
  ): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        { settings, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async updateLanguage(
    shopId: string,
    language: 'en' | 'sw',
  ): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        { language, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async findByEmail(email: string): Promise<ShopDocument | null> {
    return this.shopModel.findOne({ email }).exec();
  }

  async findByPhone(phone: string): Promise<ShopDocument | null> {
    return this.shopModel.findOne({ phone }).exec();
  }

  async updateStatus(
    shopId: string,
    status:
      | 'pending'
      | 'verified'
      | 'active'
      | 'suspended'
      | 'rejected'
      | 'flagged',
    notes?: string,
  ): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status,
          verificationDate:
            status === 'verified' || status === 'active'
              ? new Date()
              : undefined,
          verificationNotes: notes,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async incrementCashierCount(shopId: string): Promise<void> {
    const shop = await this.findById(shopId);
    if (!shop) throw new BadRequestException('Shop not found');
    if (shop.cashierCount >= 2) {
      throw new BadRequestException('Maximum 2 cashiers allowed per shop');
    }

    await this.shopModel.findByIdAndUpdate(new Types.ObjectId(shopId), {
      $inc: { cashierCount: 1 },
      updatedAt: new Date(),
    });
  }

  async decrementCashierCount(shopId: string): Promise<void> {
    await this.shopModel.findByIdAndUpdate(new Types.ObjectId(shopId), {
      $inc: { cashierCount: -1 },
      updatedAt: new Date(),
    });
  }

  async getStats(shopId: string): Promise<any> {
    const shop = await this.findById(shopId);
    if (!shop) throw new BadRequestException('Shop not found');

    return {
      name: shop.name,
      status: shop.status,
      cashierCount: shop.cashierCount,
      totalSales: shop.totalSales,
      totalOrders: shop.totalOrders,
      createdAt: shop.createdAt,
      onboardingComplete: shop.onboardingComplete,
    };
  }

  async getPendingShops(): Promise<ShopDocument[]> {
    return this.shopModel.find({ status: 'pending' }).exec();
  }

  async getActiveShops(): Promise<ShopDocument[]> {
    return this.shopModel.find({ status: 'active' }).exec();
  }

  async findAll(): Promise<any[]> {
    // Return active shops and pending shops (for demo mode)
    // Pending shops get 24 days (3 weeks + 3 days) free demo period
    const DEMO_PERIOD_DAYS = 24;
    const demoExpiryDate = new Date();
    demoExpiryDate.setDate(demoExpiryDate.getDate() - DEMO_PERIOD_DAYS);

    const shops = await this.shopModel
      .find({
        $or: [
          { status: 'active' },
          { status: 'verified' },
          // Include pending shops created within demo period
          { status: 'pending', createdAt: { $gte: demoExpiryDate } },
        ],
      })
      .select('_id shopId name status createdAt')
      .exec();

    return shops.map((shop) => {
      const result: any = {
        id: shop._id,
        shopId: shop.shopId,
        name: shop.name,
        status: shop.status,
      };

      // For pending shops, include demo expiry info
      if (shop.status === 'pending' && shop.createdAt) {
        const expiryDate = new Date(shop.createdAt);
        expiryDate.setDate(expiryDate.getDate() + DEMO_PERIOD_DAYS);
        result.demoExpiresAt = expiryDate;
        result.demoMode = true;
      }

      return result;
    });
  }
}
