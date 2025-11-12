import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(dto: CreateCustomerDto): Promise<import("./schemas/customer.schema").Customer>;
    findAll(user: Record<string, any>): Promise<import("./schemas/customer.schema").Customer[]>;
    search(query: string, user: Record<string, any>): Promise<import("./schemas/customer.schema").Customer[]>;
    findById(id: string): Promise<import("./schemas/customer.schema").Customer | null>;
    getInsights(id: string): Promise<{
        totalSpent: number;
        purchaseCount: number;
        avgOrderValue: number;
        lastVisit: Date | null;
        segment: string;
    } | null>;
    update(id: string, dto: UpdateCustomerDto): Promise<import("./schemas/customer.schema").Customer | null>;
    delete(id: string): Promise<import("./schemas/customer.schema").Customer | null>;
}
