import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const customer = new this.customerModel(dto);
    return customer.save();
  }

  async findAll(shopId: string): Promise<Customer[]> {
    return this.customerModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByPhone(shopId: string, phone: string): Promise<Customer | null> {
    return this.customerModel
      .findOne({ shopId: new Types.ObjectId(shopId), phone })
      .exec();
  }

  async search(shopId: string, query: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        shopId: new Types.ObjectId(shopId),
        $or: [
          { phone: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(10)
      .exec();
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer | null> {
    return this.customerModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Customer | null> {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  async updatePurchaseStats(
    id: string,
    amount: number,
  ): Promise<Customer | null> {
    const customer = await this.customerModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { totalPurchases: 1, totalSpent: amount },
          $set: { lastPurchaseDate: new Date(), lastVisit: new Date() },
        },
        { new: true },
      )
      .exec();

    // Recalculate segment
    if (customer) {
      await this.updateSegment(id);
    }

    return customer;
  }

  async updateSegment(customerId: string): Promise<Customer | null> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) return null;

    let segment: 'vip' | 'regular' | 'inactive' = 'regular';

    // VIP: > Ksh 50,000 lifetime
    if (customer.totalSpent > 50000) {
      segment = 'vip';
    }
    // Inactive: < Ksh 10,000 or no purchase in 90 days
    else if (
      customer.totalSpent < 10000 ||
      (customer.lastPurchaseDate &&
        new Date().getTime() - customer.lastPurchaseDate.getTime() >
          90 * 24 * 60 * 60 * 1000)
    ) {
      segment = 'inactive';
    }

    return this.customerModel
      .findByIdAndUpdate(customerId, { segment }, { new: true })
      .exec();
  }

  async getCustomerInsights(
    customerId: string,
  ): Promise<{
    totalSpent: number;
    purchaseCount: number;
    avgOrderValue: number;
    lastVisit: Date | null;
    segment: string;
  } | null> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) return null;

    return {
      totalSpent: customer.totalSpent,
      purchaseCount: customer.totalPurchases,
      avgOrderValue:
        customer.totalPurchases > 0
          ? customer.totalSpent / customer.totalPurchases
          : 0,
      lastVisit: customer.lastVisit || customer.lastPurchaseDate || null,
      segment: customer.segment || 'regular',
    };
  }
}
