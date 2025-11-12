import { ReceiptsService } from './receipts.service';
import { CreateReceiptTemplateDto } from './dto/create-receipt-template.dto';
export declare class ReceiptsController {
    private readonly receiptsService;
    constructor(receiptsService: ReceiptsService);
    createTemplate(dto: CreateReceiptTemplateDto, user: Record<string, any>): Promise<import("mongoose").Document<unknown, {}, import("./schemas/receipt-template.schema").ReceiptTemplate, {}, {}> & import("./schemas/receipt-template.schema").ReceiptTemplate & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    listTemplates(user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt-template.schema").ReceiptTemplate, {}, {}> & import("./schemas/receipt-template.schema").ReceiptTemplate & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getDefaultTemplate(user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt-template.schema").ReceiptTemplate, {}, {}> & import("./schemas/receipt-template.schema").ReceiptTemplate & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getTemplate(id: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt-template.schema").ReceiptTemplate, {}, {}> & import("./schemas/receipt-template.schema").ReceiptTemplate & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    updateTemplate(id: string, dto: Partial<CreateReceiptTemplateDto>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/receipt-template.schema").ReceiptTemplate, {}, {}> & import("./schemas/receipt-template.schema").ReceiptTemplate & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
}
