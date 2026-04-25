import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ParseUUIDPipe,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class UuidValidationPipe implements PipeTransform<string, string> {
  private readonly pipe = new ParseUUIDPipe({ version: '4' });

  async transform(value: string, metadata: ArgumentMetadata): Promise<string> {
    try {
      return await this.pipe.transform(value, metadata);
    } catch {
      throw new BadRequestException('Validation failed (uuid v4 is expected)');
    }
  }
}
