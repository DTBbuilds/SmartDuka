import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BarcodeService } from './barcode.service';
import { Product } from './schemas/product.schema';
import { BadRequestException } from '@nestjs/common';

describe('BarcodeService', () => {
  let service: BarcodeService;
  let mockProductModel: any;

  beforeEach(async () => {
    mockProductModel = {
      findOne: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarcodeService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<BarcodeService>(BarcodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateBarcode', () => {
    it('should validate EAN-13 barcode', () => {
      const barcode = '5901234123457';
      const result = service.validateBarcode(barcode);

      expect(result.format).toBe('ean13');
      expect(result.isValid).toBe(true);
    });

    it('should validate EAN-8 barcode', () => {
      const barcode = '96385074';
      const result = service.validateBarcode(barcode);

      expect(result.format).toBe('ean8');
      expect(result.isValid).toBe(true);
    });

    it('should validate Code128 barcode', () => {
      const barcode = '123456789012';
      const result = service.validateBarcode(barcode);

      expect(result.format).toBe('code128');
      expect(result.isValid).toBe(true);
    });

    it('should detect QR codes', () => {
      const barcode = 'https://example.com/product/123';
      const result = service.validateBarcode(barcode);

      expect(result.format).toBe('qr');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid barcodes', () => {
      const barcode = 'invalid';
      const result = service.validateBarcode(barcode);

      expect(result.isValid).toBe(false);
    });
  });

  describe('scanBarcode', () => {
    it('should scan and return product', async () => {
      const barcode = '5901234123457';
      const shopId = 'shop123';
      const mockProduct = {
        _id: 'prod123',
        name: 'Test Product',
        barcode,
        price: 1000,
        stock: 10,
      };

      mockProductModel.exec.mockResolvedValue(mockProduct);

      const result = await service.scanBarcode(barcode, shopId);

      expect(result).toEqual(mockProduct);
    });

    it('should throw error for invalid barcode', async () => {
      const barcode = 'invalid';
      const shopId = 'shop123';

      await expect(service.scanBarcode(barcode, shopId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for product not found', async () => {
      const barcode = '5901234123457';
      const shopId = 'shop123';

      mockProductModel.exec.mockResolvedValue(null);

      await expect(service.scanBarcode(barcode, shopId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateBarcode', () => {
    it('should generate barcode for product', async () => {
      const productId = 'prod123';
      const shopId = 'shop123';
      const mockProduct = {
        _id: productId,
        barcode: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.generateBarcode(productId, shopId);

      expect(result).toBeDefined();
      expect(result.length).toBe(13);
    });

    it('should throw error for product not found', async () => {
      const productId = 'prod123';
      const shopId = 'shop123';

      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.generateBarcode(productId, shopId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkImportBarcodes', () => {
    it('should import barcodes successfully', async () => {
      const shopId = 'shop123';
      const barcodes = [
        { barcode: '5901234123457', productId: 'prod1' },
        { barcode: '5901234123458', productId: 'prod2' },
      ];

      const mockProduct1 = {
        _id: 'prod1',
        shopId,
        barcode: null,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProduct2 = {
        _id: 'prod2',
        shopId,
        barcode: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockProductModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockProduct1),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockProduct2),
        });

      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.bulkImportBarcodes(shopId, barcodes);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle invalid barcodes', async () => {
      const shopId = 'shop123';
      const barcodes = [
        { barcode: 'invalid', productId: 'prod1' },
      ];

      const result = await service.bulkImportBarcodes(shopId, barcodes);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });
});
