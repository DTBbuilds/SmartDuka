import { StaffAssignmentService } from './staff-assignment.service';
export declare class StaffAssignmentController {
    private readonly staffAssignmentService;
    constructor(staffAssignmentService: StaffAssignmentService);
    assignToBranch(dto: {
        userId: string;
        branchId: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    assignToMultipleBranches(dto: {
        userId: string;
        branchIds: string[];
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getStaffByBranch(branchId: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    removeFromBranch(dto: {
        userId: string;
        branchId: string;
    }, user: any): Promise<{
        removed: import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    updateBranchPermissions(dto: {
        userId: string;
        branchId: string;
        permissions: any;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("../users/schemas/user.schema").User, {}, {}> & import("../users/schemas/user.schema").User & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getBranchPermissions(userId: string, branchId: string, user: any): Promise<any>;
}
