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
