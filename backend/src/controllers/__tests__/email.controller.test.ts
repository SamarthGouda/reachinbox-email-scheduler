import { describe, it, expect } from 'vitest';
import { scheduleEmailSchema } from '../email.controller.js';

describe('EmailController Validation', () => {
  it('should validate valid email schedule request payload', () => {
    const validPayload = {
      subject: 'Quarterly Product Update',
      body: '<p>Hello team, here is the update.</p>',
      recipients: ['alice@example.com', 'bob@example.com', 'charlie@domain.org'],
      startTime: new Date().toISOString(),
      delayMs: 2000,
      hourlyLimit: 200,
    };

    const parsed = scheduleEmailSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('should reject payload with empty subject or body', () => {
    const invalidPayload = {
      subject: '',
      body: '',
      recipients: ['test@example.com'],
    };

    const parsed = scheduleEmailSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it('should reject invalid email formats in recipient list', () => {
    const invalidPayload = {
      subject: 'Test Subject',
      body: 'Test Body',
      recipients: ['not-an-email', 'valid@example.com'],
    };

    const parsed = scheduleEmailSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });

  it('should reject empty recipient list', () => {
    const invalidPayload = {
      subject: 'Test Subject',
      body: 'Test Body',
      recipients: [],
    };

    const parsed = scheduleEmailSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
  });
});
