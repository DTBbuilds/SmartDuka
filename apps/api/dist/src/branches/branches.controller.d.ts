import { BranchesService } from './branches.service';
import type { CreateBranchDto, UpdateBranchDto } from './branches.service';
export declare class BranchesController {
    private readonly branchesService;
    constructor(branchesService: BranchesService);
    create(dto: CreateBranchDto, user: any): Promise<import("./branch.schema").BranchDocument>;
    findByShop(user: any): Promise<import("./branch.schema").BranchDocument[]>;
    getActive(user: any): Promise<import("./branch.schema").BranchDocument[]>;
    findById(id: string, user: any): Promise<import("./branch.schema").BranchDocument | null>;
    update(id: string, dto: UpdateBranchDto, user: any): Promise<import("./branch.schema").BranchDocument | null>;
    delete(id: string, user: any): Promise<{
        deleted: boolean;
    }>;
}
