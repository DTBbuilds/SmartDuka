export declare function generateShopId(sequenceNumber: number): string;
export declare function extractSequenceNumber(shopId: string): number | null;
export declare function isValidShopId(shopId: string): boolean;
export declare function getNextSequenceNumber(lastSequenceNumber: number): number;
