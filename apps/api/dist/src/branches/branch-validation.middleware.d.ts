import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { BranchDocument } from './branch.schema';
export declare class BranchValidationMiddleware implements NestMiddleware {
    private readonly branchModel;
    private readonly logger;
    constructor(branchModel: Model<BranchDocument>);
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
