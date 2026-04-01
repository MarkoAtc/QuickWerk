import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { UploadUrlRecord } from '@quickwerk/domain';

import { CreateUploadUrlInput, UploadUrlRepository } from '../domain/upload-url.repository';

const UPLOAD_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class InMemoryUploadUrlRepository implements UploadUrlRepository {
  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlRecord> {
    const uploadId = randomUUID();
    const expiresAt = new Date(new Date(input.now).getTime() + UPLOAD_URL_TTL_MS).toISOString();

    return {
      uploadId,
      providerUserId: input.providerUserId,
      presignedUrl: `https://storage.stub/uploads/${uploadId}?token=stub-presigned-token`,
      expiresAt,
      filename: input.filename,
      mimeType: input.mimeType,
    };
  }
}
