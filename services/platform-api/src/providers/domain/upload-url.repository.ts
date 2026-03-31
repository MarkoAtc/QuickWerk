import type { UploadUrlRecord } from '@quickwerk/domain';

export type CreateUploadUrlInput = {
  providerUserId: string;
  filename: string;
  mimeType: string;
  now: string;
};

export interface UploadUrlRepository {
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlRecord>;
}

export const UPLOAD_URL_REPOSITORY = Symbol('UPLOAD_URL_REPOSITORY');
