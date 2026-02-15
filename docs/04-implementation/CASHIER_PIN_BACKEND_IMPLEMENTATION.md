# SmartDuka Cashier PIN Login - Backend Implementation

**Status**: Ready for Implementation
**Priority**: HIGH
**Estimated Time**: 3-4 hours

---

## Phase 1: Backend PIN Management Endpoints

### 1.1 Create PIN Management DTOs

**File**: `apps/api/src/users/dto/create-cashier.dto.ts` (NEW)

```typescript
import { IsString, IsOptional, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateCashierDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsPhoneNumber('KE')
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
```

**File**: `apps/api/src/users/dto/update-pin.dto.ts` (NEW)

```typescript
import { IsString, Matches } from 'class-validator';

export class UpdatePinDto {
  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'PIN must be 4-6 digits',
  })
  pin: string;
}

export class ChangePinDto {
  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'Current PIN must be 4-6 digits',
  })
  currentPin: string;

  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'New PIN must be 4-6 digits',
  })
  newPin: string;

  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'Confirm PIN must be 4-6 digits',
  })
  confirmPin: string;
}
```

### 1.2 Update Users Service

**File**: `apps/api/src/users/users.service.ts` (ADD METHODS)

```typescript
async generatePin(): Promise<string> {
  let pin = '';
  do {
    pin = Math.floor(Math.random() * 1000000).toString().padStart(4, '0');
  } while (this.isInvalidPin(pin));
  return pin;
}

private isInvalidPin(pin: string): boolean {
  const isSequential = /^(\d)\1+$/.test(pin) || 
    /^(?:0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210)/.test(pin);
  const isRepeated = /^(\d)\1{3,}$/.test(pin);
  return isSequential || isRepeated;
}

async createCashierWithPin(
  shopId: string,
  createCashierDto: CreateCashierDto,
): Promise<{ user: any; pin: string }> {
  const pin = await this.generatePin();
  const hashedPin = await bcryptjs.hash(pin, 10);

  const cashierCount = await this.userModel.countDocuments({
    shopId: new Types.ObjectId(shopId),
    role: 'cashier',
  });
  const cashierId = `C${String(cashierCount + 1).padStart(3, '0')}`;

  const user = new this.userModel({
    shopId: new Types.ObjectId(shopId),
    name: createCashierDto.name,
    phone: createCashierDto.phone,
    email: createCashierDto.email || `cashier-${cashierId}@shop.local`,
    role: 'cashier',
    status: 'active',
    pinHash: hashedPin,
    cashierId,
    passwordHash: await bcryptjs.hash(Math.random().toString(), 10),
  });

  await user.save();

  return {
    user: user.toObject({ versionKey: false }),
    pin,
  };
}

async resetPin(userId: string, shopId: string): Promise<string> {
  const user = await this.userModel.findOne({
    _id: new Types.ObjectId(userId),
    shopId: new Types.ObjectId(shopId),
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if ((user as any).role !== 'cashier') {
    throw new BadRequestException('Can only reset PIN for cashiers');
  }

  const newPin = await this.generatePin();
  const hashedPin = await bcryptjs.hash(newPin, 10);

  await this.userModel.findByIdAndUpdate(
    userId,
    { pinHash: hashedPin },
    { new: true },
  );

  return newPin;
}

async changePin(
  userId: string,
  currentPin: string,
  newPin: string,
): Promise<void> {
  const user = await this.userModel.findById(userId);

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const isValid = await this.validatePin(user, currentPin);
  if (!isValid) {
    throw new UnauthorizedException('Current PIN is incorrect');
  }

  if (this.isInvalidPin(newPin)) {
    throw new BadRequestException('Invalid PIN format');
  }

  const hashedPin = await bcryptjs.hash(newPin, 10);
  await this.userModel.findByIdAndUpdate(
    userId,
    { pinHash: hashedPin },
    { new: true },
  );
}
```

### 1.3 Update Users Controller

**File**: `apps/api/src/users/users.controller.ts` (ADD ENDPOINTS)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post('cashier')
async createCashier(
  @Body() dto: CreateCashierDto,
  @CurrentUser() user: any,
) {
  const { user: createdUser, pin } = await this.usersService.createCashierWithPin(
    user.shopId,
    dto,
  );

  return {
    user: {
      id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      cashierId: createdUser.cashierId,
      role: createdUser.role,
      status: createdUser.status,
    },
    pin,
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post(':id/reset-pin')
async resetPin(
  @Param('id') userId: string,
  @CurrentUser() user: any,
) {
  const newPin = await this.usersService.resetPin(userId, user.shopId);

  return {
    message: 'PIN reset successfully',
    pin: newPin,
  };
}

@UseGuards(JwtAuthGuard)
@Post('me/change-pin')
async changePin(
  @Body() dto: ChangePinDto,
  @CurrentUser() user: any,
) {
  if (dto.newPin !== dto.confirmPin) {
    throw new BadRequestException('New PINs do not match');
  }

  await this.usersService.changePin(
    user.sub,
    dto.currentPin,
    dto.newPin,
  );

  return { message: 'PIN changed successfully' };
}
```

### 1.4 Create PIN Rate Limiting Guard

**File**: `apps/api/src/auth/guards/pin-rate-limit.guard.ts` (NEW)

```typescript
import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';

@Injectable()
export class PinRateLimitGuard implements CanActivate {
  private attempts = new Map<string, { count: number; timestamp: number }>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCKOUT_TIME = 15 * 60 * 1000;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { pin, shopId } = request.body;

    const key = `${shopId}:${pin}`;
    const now = Date.now();

    const attempt = this.attempts.get(key);

    if (attempt) {
      if (now - attempt.timestamp < this.LOCKOUT_TIME) {
        if (attempt.count >= this.MAX_ATTEMPTS) {
          throw new TooManyRequestsException(
            'Too many failed attempts. Please try again later.',
          );
        }
        attempt.count++;
      } else {
        this.attempts.set(key, { count: 1, timestamp: now });
      }
    } else {
      this.attempts.set(key, { count: 1, timestamp: now });
    }

    return true;
  }
}
```

### 1.5 Update Auth Controller

**File**: `apps/api/src/auth/auth.controller.ts` (MODIFY)

```typescript
@UseGuards(PinRateLimitGuard)
@Post('login-pin')
async loginWithPin(
  @Body() body: { pin: string; shopId: string },
  @Req() req: any,
) {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  return this.authService.loginWithPin(body.pin, body.shopId, ipAddress, userAgent);
}
```

---

## 📋 Backend Implementation Checklist

- [ ] Create CreateCashierDto
- [ ] Create UpdatePinDto and ChangePinDto
- [ ] Add PIN generation method to UsersService
- [ ] Add createCashierWithPin method
- [ ] Add resetPin method
- [ ] Add changePin method
- [ ] Add createCashier endpoint
- [ ] Add resetPin endpoint
- [ ] Add changePin endpoint
- [ ] Create PinRateLimitGuard
- [ ] Update login-pin endpoint with rate limiting
- [ ] Test all endpoints
- [ ] Test rate limiting
- [ ] Test PIN validation

---

## 🧪 Backend Testing Commands

```bash
# Test PIN generation
curl -X POST http://localhost:5000/users/cashier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "John Doe", "phone": "+254712345678"}'

# Test PIN reset
curl -X POST http://localhost:5000/users/CASHIER_ID/reset-pin \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test PIN change
curl -X POST http://localhost:5000/users/me/change-pin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"currentPin": "1234", "newPin": "5678", "confirmPin": "5678"}'

# Test PIN login
curl -X POST http://localhost:5000/auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234", "shopId": "SHOP_ID"}'
```

---

**Next**: Frontend Implementation (see CASHIER_PIN_FRONTEND_IMPLEMENTATION.md)
