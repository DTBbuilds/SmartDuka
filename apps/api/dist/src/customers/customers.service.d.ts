import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersService {
    private customerModel;
    constructor(customerModel: Model<CustomerDocument>);
    create(dto: CreateCustomerDto): Promise<Customer>;
    findAll(shopId: string): Promise<Customer[]>;
    findById(id: string): Promise<Customer | null>;
    findByPhone(shopId: string, phone: string): Promise<Customer | null>;
    search(shopId: string, query: string): Promise<Customer[]>;
    update(id: string, dto: UpdateCustomerDto): Promise<Customer | null>;
    delete(id: string): Promise<Customer | null>;
    updatePurchaseStats(id: string, amount: number): Promise<Customer | null>;
    updateSegment(customerId: string): Promise<Customer | null>;
    getCustomerInsights(customerId: string): Promise<{
        totalSpent: number;
        purchaseCount: number;
        avgOrderValue: number;
        lastVisit: Date | null;
        segment: string;
    } | null>;
}
