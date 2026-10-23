import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { DarajaService } from './daraja.service';
import { OrderPaymentAuthorityService } from './services/order-payment-authority.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: DarajaService, useValue: {} },
        { provide: OrderPaymentAuthorityService, useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
