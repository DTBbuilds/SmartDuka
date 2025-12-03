import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from './shop.schema';
import { generateShopId } from './utils/shop-id-generator';

export interface CreateShopDto {
  name: string;
  email: string;
  phone: string;
  tillNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  businessType?: string;
  kraPin?: string;
  language?: 'en' | 'sw';
}

export interface UpdateShopDto {
  name?: string;
  tillNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  businessType?: string;
  kraPin?: string;
  language?: 'en' | 'sw';
  status?: 'pending' | 'verified' | 'active' | 'suspended';
  settings?: Record<string, any>;
  onboardingComplete?: boolean;
}

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(@InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>) {}

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

      // Remove kraPin from dto to avoid it being spread with wrong value
      const { kraPin: _ignoredKraPin, ...restDto } = dto;

      const shopData: any = {
        ...restDto,
        shopId,  // Add human-readable shop ID
        ownerId: ownerId ? new Types.ObjectId(ownerId) : undefined,
        language: dto.language || 'en',
        status: 'pending',
        cashierCount: 0,
        totalSales: 0,
        totalOrders: 0,
        onboardingComplete: false,
      };

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
          throw new BadRequestException('Shop ID generation conflict, please try again');
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
    return this.shopModel.findOne({ ownerId: new Types.ObjectId(ownerId) }).exec();
  }

  async update(shopId: string, dto: UpdateShopDto): Promise<ShopDocument | null> {
    try {
      // Remove kraPin from dto to handle separately
      const { kraPin: dtoKraPin, ...restDto } = dto;

      const updateData: any = {
        ...restDto,
        updatedAt: new Date(),
      };
      
      // Handle kraPin separately - only update if explicitly provided
      if (dtoKraPin !== undefined) {
        if (dtoKraPin && typeof dtoKraPin === 'string') {
          const trimmed = dtoKraPin.trim().toUpperCase();
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
        .findByIdAndUpdate(
          new Types.ObjectId(shopId),
          updateData,
          { new: true },
        )
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
          throw new BadRequestException('KRA PIN already registered to another shop');
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

  async updateSettings(shopId: string, settings: Record<string, any>): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        { settings, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async updateLanguage(shopId: string, language: 'en' | 'sw'): Promise<ShopDocument | null> {
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
    status: 'pending' | 'verified' | 'active' | 'suspended',
    notes?: string,
  ): Promise<ShopDocument | null> {
    return this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status,
          verificationDate: status === 'verified' || status === 'active' ? new Date() : undefined,
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
