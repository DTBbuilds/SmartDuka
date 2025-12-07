import { BranchesService } from './branches.service';
import type { CreateBranchDto, UpdateBranchDto } from './branches.service';
export declare class BranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    create(dto: CreateBranchDto, user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument;
    }>;
    findByShop(user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument[];
        count: number;
    }>;
    getActive(user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument[];
        count: number;
    }>;
    getBranchesWithPaymentConfig(user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument[];
        count: number;
    }>;
    getDeliveryBranches(user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument[];
        count: number;
    }>;
    getByCounty(county: string, user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument[];
        count: number;
    }>;
    findById(id: string, user: any): Promise<{
        success: boolean;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    getPaymentConfigStatus(id: string, user: any): Promise<{
        success: boolean;
        data: {
            hasOwnConfig: boolean;
            usesShopConfig: boolean;
            isConfigured: boolean;
            isVerified: boolean;
            shortCode?: string;
            type?: string;
        };
    }>;
    update(id: string, dto: UpdateBranchDto, user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    updatePaymentConfig(id: string, paymentConfig: CreateBranchDto['paymentConfig'], user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    assignManager(id: string, managerId: string, user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    addStaff(id: string, staffId: string, user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    removeStaff(id: string, staffId: string, user: any): Promise<{
        success: boolean;
        message: string;
        data: import("./branch.schema").BranchDocument | null;
    }>;
    delete(id: string, user: any): Promise<{
        success: boolean;
        message: string;
        deleted: boolean;
    }>;
}
