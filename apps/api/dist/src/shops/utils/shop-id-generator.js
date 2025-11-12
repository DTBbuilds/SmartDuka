"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShopId = generateShopId;
exports.extractSequenceNumber = extractSequenceNumber;
exports.isValidShopId = isValidShopId;
exports.getNextSequenceNumber = getNextSequenceNumber;
function generateShopId(sequenceNumber) {
    const sequencePart = String(sequenceNumber).padStart(5, '0');
    const randomCode = generateRandomCode(5);
    return `SHP-${sequencePart}-${randomCode}`;
}
function generateRandomCode(length) {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}
function extractSequenceNumber(shopId) {
    const match = shopId.match(/^SHP-(\d{5})-[A-Z0-9]{5}$/);
    if (!match)
        return null;
    return parseInt(match[1], 10);
}
function isValidShopId(shopId) {
    return /^SHP-\d{5}-[A-Z0-9]{5}$/.test(shopId);
}
function getNextSequenceNumber(lastSequenceNumber) {
    return lastSequenceNumber + 1;
}
//# sourceMappingURL=shop-id-generator.js.map