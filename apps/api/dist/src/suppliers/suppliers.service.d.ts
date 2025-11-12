import { Model } from 'mongoose';
import { SupplierDocument } from './supplier.schema';
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
export declare class SuppliersService {
    private readonly supplierModel;
    private readonly logger;
    constructor(supplierModel: Model<SupplierDocument>);
    create(shopId: string, dto: CreateSupplierDto): Promise<SupplierDocument>;
    findAll(shopId: string): Promise<SupplierDocument[]>;
    findById(supplierId: string, shopId: string): Promise<SupplierDocument | null>;
    update(supplierId: string, shopId: string, dto: UpdateSupplierDto): Promise<SupplierDocument | null>;
    delete(supplierId: string, shopId: string): Promise<boolean>;
    getActive(shopId: string): Promise<SupplierDocument[]>;
}
