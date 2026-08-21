import { describe, it, expect, beforeEach, vi } from 'vitest';
import RedisMock from 'ioredis-mock';

// Mock redis.service.js with ioredis-mock for isolated testing
vi.mock('../redis.service.js', () => {
  const mockRedis = new RedisMock();
  return {
    redisClient: mockRedis,
    getRedisConnectionOptions: () => ({ host: 'localhost', port: 6379 }),
    checkRedisConnection: async () => true,
  };
});

import { RateLimiterService } from '../rate-limiter.service.js';
import { redisClient } from '../redis.service.js';

describe('RateLimiterService (Redis-backed Hourly Limiting & Minimum Delay)', () => {
  beforeEach(async () => {
    // Clear test keys in mock
    const keys = await redisClient.keys('email-*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  it('should allow requests within the hourly limit and reject/delay when limit is exceeded', async () => {
    const senderId = 'test-sender-1';
    const limit = 3;

    // First 3 requests should be allowed
    const r1 = await RateLimiterService.checkAndConsumeHourlyLimit(senderId, limit);
    expect(r1.allowed).toBe(true);
    expect(r1.currentCount).toBe(1);

    const r2 = await RateLimiterService.checkAndConsumeHourlyLimit(senderId, limit);
    expect(r2.allowed).toBe(true);
    expect(r2.currentCount).toBe(2);

    const r3 = await RateLimiterService.checkAndConsumeHourlyLimit(senderId, limit);
    expect(r3.allowed).toBe(true);
    expect(r3.currentCount).toBe(3);

    // 4th request exceeds limit -> must return allowed: false and next window delay
    const r4 = await RateLimiterService.checkAndConsumeHourlyLimit(senderId, limit);
    expect(r4.allowed).toBe(false);
    expect(r4.delayUntilNextWindowMs).toBeGreaterThan(0);
    console.log(`Rate limit reached: Job scheduled with delay ${r4.delayUntilNextWindowMs}ms`);
  });

  it('should calculate minimum delay spacing between consecutive sends', async () => {
    const senderId = 'test-sender-2';
    const minDelayMs = 1500;

    // First send slot: 0 delay
    const wait1 = await RateLimiterService.acquireDelaySlot(senderId, minDelayMs);
    expect(wait1).toBe(0);

    // Immediate second send slot: wait required
    const wait2 = await RateLimiterService.acquireDelaySlot(senderId, minDelayMs);
    expect(wait2).toBeGreaterThanOrEqual(1400);
    console.log(`Minimum delay enforced: Wait slot = ${wait2}ms`);
  });
});
