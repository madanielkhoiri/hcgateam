import { Module } from '@nestjs/common';
import { SignatureLibraryController } from './signature-library.controller';

@Module({
  controllers: [SignatureLibraryController],
})
export class SignatureLibraryModule {}
