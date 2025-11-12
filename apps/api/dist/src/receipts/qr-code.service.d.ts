export declare class QRCodeService {
    private readonly logger;
    generateQRCode(data: string, size?: number): string;
    generateProductQRCode(productId: string, productName: string): string;
    generateOrderQRCode(orderId: string, orderNumber: string, total: number): string;
    generateLoyaltyQRCode(customerId: string, loyaltyCode: string): string;
    generatePaymentQRCode(orderId: string, amount: number, phoneNumber: string): string;
}
