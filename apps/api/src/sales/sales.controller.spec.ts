import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ReceiptService } from './services/receipt.service';
import { InvoiceService } from './services/invoice.service';

jest.mock('nanoid', () => ({
  nanoid: () => 'TESTID',
}));

describe('SalesController', () => {
  let controller: SalesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        { provide: SalesService, useValue: { checkout: jest.fn() } },
        { provide: ReceiptService, useValue: {} },
        { provide: InvoiceService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
