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

      // Convert empty kraPin to null to avoid duplicate key errors
      const shopData = {
        ...dto,
        shopId,  // Add human-readable shop ID
        ownerId: ownerId ? new Types.ObjectId(ownerId) : undefined,
        language: dto.language || 'en',
        status: 'pending',
        cashierCount: 0,
        totalSales: 0,
        totalOrders: 0,
        onboardingComplete: false,
        kraPin: dto.kraPin && dto.kraPin.trim() ? dto.kraPin : null,
      };
      
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
      // Convert empty kraPin to null to avoid duplicate key errors
      const updateData = {
        ...dto,
        updatedAt: new Date(),
        kraPin: dto.kraPin !== undefined ? (dto.kraPin && dto.kraPin.trim() ? dto.kraPin : null) : undefined,
      };
      
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
          throw new BadRequestException('KRA PIN already registered');
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
    // Return only active shops for login page
    const shops = await this.shopModel.find({ status: 'active' }).select('_id name').exec();
    return shops.map((shop) => ({
      id: shop._id,
      name: shop.name,
    }));
  }
}
