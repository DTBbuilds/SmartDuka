# Inventory Synchronization - Implementation Guide

**Priority**: CRITICAL
**Effort**: 25-35 hours
**Timeline**: 2-3 weeks

---

## PHASE 1: Stock Reduction on Sale (4-6 hours)

### Step 1: Update Sales Service

**File**: `apps/api/src/sales/sales.service.ts`

Add inventory service injection and implement stock reduction:

```typescript
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,  // ADD THIS
  ) {}

  async checkout(shopId: string, userId: string, dto: CheckoutDto): Promise<OrderDocument> {
    // 1. VALIDATE STOCK
    for (const item of dto.items) {
      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(item.productId),
        shopId: new Types.ObjectId(shopId),
      });
      
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }
      
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }
    }

    // 2. CALCULATE TOTALS
    const subtotal = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (subtotal <= 0) {
      throw new BadRequestException('Subtotal must be greater than zero');
    }

    const taxRate = dto.taxRate ?? 0.02;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;

    const paymentsTotal = (dto.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
    const paymentStatus = paymentsTotal >= total ? 'paid' : paymentsTotal > 0 ? 'partial' : 'unpaid';

    const orderNumber = `STK-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    // 3. CREATE ORDER
    const order = new this.orderModel({
      shopId: new Types.ObjectId(shopId),
      userId: new Types.ObjectId(userId),
      orderNumber,
      items: dto.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity,
      })),
      subtotal,
      tax,
      total,
      status: dto.status ?? 'completed',
      paymentStatus,
      payments: dto.payments ?? [],
      notes: dto.notes,
      customerName: dto.customerName,
      cashierId: dto.cashierId,
      cashierName: dto.cashierName,
      isOffline: dto.isOffline ?? false,
    });

    await order.save();

    // 4. REDUCE STOCK FOR EACH ITEM
    for (const item of dto.items) {
      // Update product stock
      await this.inventoryService.updateStock(
        shopId,
        item.productId,
        -item.quantity  // Negative = reduction
      );

      // Log stock adjustment
      await this.inventoryService.createStockAdjustment(
        shopId,
        item.productId,
        -item.quantity,
        'sale',
        userId,
        `Order ${orderNumber}`
      );
    }

    return order;
  }
}
```

### Step 2: Update POS Frontend Validation

**File**: `apps/web/src/app/pos/page.tsx`

Add stock validation before checkout:

```typescript
const handleCheckout = async () => {
  if (cartItems.length === 0) {
    toast({ type: 'info', title: 'Cart is empty', message: 'Add items before checkout' });
    return;
  }

  // VALIDATE STOCK FOR EACH ITEM
  for (const item of cartItems) {
    const product = products.find(p => p._id === item.productId);
    if (!product) {
      toast({ type: 'error', title: 'Product not found', message: item.name });
      return;
    }
    
    if (product.stock < item.quantity) {
      toast({
        type: 'error',
        title: 'Insufficient stock',
        message: `${item.name}: Only ${product.stock} available, requested ${item.quantity}`
      });
      return;
    }
  }

  // Validate payment method selection
  if (!selectedPaymentMethod) {
    toast({ type: 'error', title: 'Payment method required', message: 'Please select a payment method to proceed' });
    setCheckoutError('Please select a payment method to proceed');
    return;
  }

  // ... rest of checkout logic ...
};
```

### Step 3: Update Sales Module

**File**: `apps/api/src/sales/sales.module.ts`

Import InventoryModule:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { InventoryModule } from '../inventory/inventory.module';  // ADD THIS

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    InventoryModule,  // ADD THIS
  ],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
```

---

## PHASE 2: PO to Inventory Integration (3-4 hours)

### Step 1: Update Purchases Service

**File**: `apps/api/src/purchases/purchases.service.ts`

Add inventory update on PO receipt:

```typescript
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
    private readonly inventoryService: InventoryService,  // ADD THIS
  ) {}

  async update(
    purchaseId: string,
    shopId: string,
    dto: UpdatePurchaseDto,
    userId: string,  // ADD THIS PARAMETER
  ): Promise<PurchaseDocument | null> {
    const purchase = await this.purchaseModel.findOne({
      _id: new Types.ObjectId(purchaseId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    // IF STATUS CHANGED TO "RECEIVED", UPDATE STOCK
    if (dto.status === 'received' && purchase.status !== 'received') {
      for (const item of purchase.items) {
        // Increase product stock
        await this.inventoryService.updateStock(
          shopId,
          item.productId.toString(),
          item.quantity  // Positive = increase
        );

        // Log stock adjustment
        await this.inventoryService.createStockAdjustment(
          shopId,
          item.productId.toString(),
          item.quantity,
          'purchase_received',
          userId,
          `Purchase Order ${purchase.purchaseNumber} received`
        );
      }
    }

    return this.purchaseModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(purchaseId),
          shopId: new Types.ObjectId(shopId),
        },
        { ...dto, updatedAt: new Date() },
        { new: true }
      )
      .populate('supplierId', 'name phone email')
      .exec();
  }
}
```

### Step 2: Update Purchases Controller

**File**: `apps/api/src/purchases/purchases.controller.ts`

Pass userId to update method:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Put(':id')
async update(
  @Param('id') id: string,
  @Body() dto: any,
  @CurrentUser() user: Record<string, any>,
) {
  return this.purchasesService.update(id, user.shopId, dto, user.sub);  // ADD user.sub
}
```

### Step 3: Update Purchases Module

**File**: `apps/api/src/purchases/purchases.module.ts`

Import InventoryModule:

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { Purchase, PurchaseSchema } from './purchase.schema';
import { InventoryModule } from '../inventory/inventory.module';  // ADD THIS

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Purchase.name, schema: PurchaseSchema }]),
    InventoryModule,  // ADD THIS
  ],
  providers: [PurchasesService],
  controllers: [PurchasesController],
})
export class PurchasesModule {}
```

---

## PHASE 3: Reorder Point Automation (5-7 hours)

### Step 1: Update Product Schema

**File**: `apps/api/src/inventory/schemas/product.schema.ts`

Add reorder fields:

```typescript
@Prop({ required: false, min: 0, default: 0 })
reorderPoint?: number;  // Minimum stock level

@Prop({ required: false, min: 0, default: 0 })
reorderQuantity?: number;  // Quantity to order

@Prop({ required: false })
lastRestockDate?: Date;  // When last restocked

@Prop({ required: false, min: 0, default: 0 })
leadTimeDays?: number;  // Supplier delivery time
```

### Step 2: Create Reorder Service

**File**: `apps/api/src/reorder/reorder.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import { Purchase, PurchaseDocument } from '../purchases/purchase.schema';

@Injectable()
export class ReorderService {
  private readonly logger = new Logger(ReorderService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
  ) {}

  async checkAndCreatePOs(shopId: string, userId: string): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    try {
      // Find products below reorder point
      const productsToReorder = await this.productModel.find({
        shopId: new Types.ObjectId(shopId),
        stock: { $lte: { $ref: 'reorderPoint' } },
        status: 'active',
        reorderPoint: { $gt: 0 },
      });

      for (const product of productsToReorder) {
        try {
          // Check if PO already exists
          const existingPO = await this.purchaseModel.findOne({
            shopId: new Types.ObjectId(shopId),
            'items.productId': product._id,
            status: 'pending',
          });

          if (!existingPO) {
            // Create new PO
            const po = new this.purchaseModel({
              purchaseNumber: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              shopId: new Types.ObjectId(shopId),
              supplierId: product.supplierId,  // Requires supplier link
              items: [{
                productId: product._id,
                productName: product.name,
                quantity: product.reorderQuantity || 50,
                unitCost: product.cost || 0,
                totalCost: (product.reorderQuantity || 50) * (product.cost || 0),
              }],
              totalCost: (product.reorderQuantity || 50) * (product.cost || 0),
              status: 'pending',
              createdBy: new Types.ObjectId(userId),
            });

            await po.save();
            created++;
            this.logger.log(`Auto-generated PO for ${product.name}`);
          }
        } catch (err: any) {
          errors.push(`Failed to create PO for ${product.name}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error('Error checking reorder points', err);
      errors.push(`Reorder check failed: ${err.message}`);
    }

    return { created, errors };
  }

  async getLowStockProducts(shopId: string): Promise<ProductDocument[]> {
    return this.productModel.find({
      shopId: new Types.ObjectId(shopId),
      $expr: { $lte: ['$stock', '$reorderPoint'] },
      status: 'active',
    }).sort({ stock: 1 });
  }
}
```

### Step 3: Create Reorder Controller

**File**: `apps/api/src/reorder/reorder.controller.ts` (NEW)

```typescript
import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ReorderService } from './reorder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reorder')
export class ReorderController {
  constructor(private readonly reorderService: ReorderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('check-and-create')
  async checkAndCreatePOs(@CurrentUser() user: Record<string, any>) {
    return this.reorderService.checkAndCreatePOs(user.shopId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('low-stock')
  async getLowStockProducts(@CurrentUser() user: Record<string, any>) {
    return this.reorderService.getLowStockProducts(user.shopId);
  }
}
```

---

## TESTING CHECKLIST

### Phase 1 Testing:
- [ ] Add product with stock: 10 units
- [ ] Add to cart: 5 units
- [ ] Checkout succeeds, stock becomes 5
- [ ] Add to cart: 6 units (should fail - only 5 available)
- [ ] Stock adjustment logged correctly

### Phase 2 Testing:
- [ ] Create PO for 100 units
- [ ] Mark as received
- [ ] Stock increases by 100
- [ ] Stock adjustment logged

### Phase 3 Testing:
- [ ] Set reorder point: 10 units
- [ ] Set reorder quantity: 50 units
- [ ] Reduce stock to 9 units
- [ ] Run reorder check
- [ ] Auto-PO created for 50 units

---

## DEPLOYMENT STEPS

1. Backup MongoDB
2. Deploy Phase 1 code
3. Test thoroughly
4. Deploy Phase 2 code
5. Test thoroughly
6. Deploy Phase 3 code
7. Monitor for issues
8. Gather user feedback
