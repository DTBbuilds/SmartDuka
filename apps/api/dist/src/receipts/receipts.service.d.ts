import { Model } from 'mongoose';
import { ReceiptTemplateDocument } from './schemas/receipt-template.schema';
import { CreateReceiptTemplateDto } from './dto/create-receipt-template.dto';
export declare class ReceiptsService {
    private receiptTemplateModel;
    constructor(receiptTemplateModel: Model<ReceiptTemplateDocument>);
    createTemplate(shopId: string, dto: CreateReceiptTemplateDto): Promise<ReceiptTemplateDocument>;
    findAll(shopId: string): Promise<ReceiptTemplateDocument[]>;
    findById(id: string): Promise<ReceiptTemplateDocument | null>;
    getDefault(shopId: string): Promise<ReceiptTemplateDocument | null>;
    updateTemplate(id: string, dto: Partial<CreateReceiptTemplateDto>): Promise<ReceiptTemplateDocument | null>;
    deleteTemplate(id: string): Promise<ReceiptTemplateDocument | null>;
    generateReceiptHTML(template: ReceiptTemplateDocument, orderData: {
        orderNumber: string;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
            total: number;
        }>;
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
        paymentMethod: string;
        cashierName: string;
        timestamp: Date;
    }): Promise<string>;
}
