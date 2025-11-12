import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';

export interface CreateSupplierDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
  ) {}

  async create(shopId: string, dto: CreateSupplierDto): Promise<SupplierDocument> {
    const supplier = new this.supplierModel({
      ...dto,
      shopId: new Types.ObjectId(shopId),
      status: 'active',
    });
    return supplier.save();
  }

  async findAll(shopId: string): Promise<SupplierDocument[]> {
    return this.supplierModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ name: 1 })
      .exec();
  }

  async findById(supplierId: string, shopId: string): Promise<SupplierDocument | null> {
    return this.supplierModel
      .findOne({
        _id: new Types.ObjectId(supplierId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  async update(
    supplierId: string,
    shopId: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierDocument | null> {
    return this.supplierModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(supplierId),
          shopId: new Types.ObjectId(shopId),
        },
        { ...dto, updatedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async delete(supplierId: string, shopId: string): Promise<boolean> {
    const result = await this.supplierModel
      .deleteOne({
        _id: new Types.ObjectId(supplierId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    return result.deletedCount > 0;
  }

  async getActive(shopId: string): Promise<SupplierDocument[]> {
    return this.supplierModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .sort({ name: 1 })
      .exec();
  }
}
