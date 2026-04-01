import { describe, expect, it } from 'vitest';

import { AuthSession } from '../auth/domain/auth-session.repository';
import { InMemoryUploadUrlRepository } from './infrastructure/in-memory-upload-url.repository';
import { InMemoryProviderProfileRepository } from './infrastructure/in-memory-provider-profile.repository';
import { InMemoryProviderVerificationRepository } from './infrastructure/in-memory-provider-verification.repository';
import { ProvidersService } from './providers.service';

const createSession = (role: AuthSession['role'], userId: string): AuthSession => {
  const createdAt = new Date();
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 1000 * 60 * 60).toISOString(),
    email: `${role}@quickwerk.local`,
    role,
    token: `${role}-token`,
    userId,
  };
};

const createService = () =>
  new ProvidersService(
    new InMemoryProviderVerificationRepository(),
    new InMemoryProviderProfileRepository(),
    new InMemoryUploadUrlRepository(),
  );

describe('ProvidersService.requestUploadUrl', () => {
  it('returns 403 when customer requests an upload URL', async () => {
    const service = createService();
    const customer = createSession('customer', 'customer-1');

    const result = await service.requestUploadUrl(customer, {
      filename: 'license.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);
  });

  it('returns a presigned URL for a provider', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    const result = await service.requestUploadUrl(provider, {
      filename: 'license.pdf',
      mimeType: 'application/pdf',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.uploadUrl.uploadId).toBeDefined();
    expect(result.uploadUrl.presignedUrl).toContain('stub-presigned-token');
    expect(result.uploadUrl.expiresAt).toBeDefined();
    expect(result.uploadUrl.filename).toBe('license.pdf');
    expect(result.uploadUrl.mimeType).toBe('application/pdf');
    expect(result.statusCode).toBe(201);
  });

  it('generates a unique uploadId for each request', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    const first = await service.requestUploadUrl(provider, {
      filename: 'doc1.pdf',
      mimeType: 'application/pdf',
    });
    const second = await service.requestUploadUrl(provider, {
      filename: 'doc2.pdf',
      mimeType: 'application/pdf',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.uploadUrl.uploadId).not.toBe(second.uploadUrl.uploadId);
  });

  it('expiry is ~15 minutes from now', async () => {
    const service = createService();
    const provider = createSession('provider', 'provider-1');

    const before = Date.now();
    const result = await service.requestUploadUrl(provider, {
      filename: 'cert.jpg',
      mimeType: 'image/jpeg',
    });
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expiresMs = new Date(result.uploadUrl.expiresAt).getTime();
    const lowerBound = before + 15 * 60 * 1000 - 1000;
    const upperBound = after + 15 * 60 * 1000 + 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(lowerBound);
    expect(expiresMs).toBeLessThanOrEqual(upperBound);
  });
});