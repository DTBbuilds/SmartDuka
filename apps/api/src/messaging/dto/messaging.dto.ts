import { IsString, IsOptional, IsEnum, IsArray, IsMongoId } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  subject: string;

  @IsOptional()
  @IsEnum(['support', 'inquiry', 'billing', 'technical', 'general'])
  type?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  initialMessage?: string;
}

export class SendMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(['open', 'pending', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsMongoId()
  superAdminId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MarkMessagesReadDto {
  @IsMongoId()
  conversationId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  messageIds?: string[];
}
