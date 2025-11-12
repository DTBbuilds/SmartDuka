import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(dto: any, user: Record<string, any>): Promise<import("./supplier.schema").SupplierDocument>;
    findAll(user: Record<string, any>): Promise<import("./supplier.schema").SupplierDocument[]>;
    getActive(user: Record<string, any>): Promise<import("./supplier.schema").SupplierDocument[]>;
    findById(id: string, user: Record<string, any>): Promise<import("./supplier.schema").SupplierDocument | null>;
    update(id: string, dto: any, user: Record<string, any>): Promise<import("./supplier.schema").SupplierDocument | null>;
    delete(id: string, user: Record<string, any>): Promise<{
        deleted: boolean;
    }>;
}
