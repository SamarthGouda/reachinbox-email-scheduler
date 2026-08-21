import { describe, it, expect } from 'vitest';
import { sendEmail } from '../smtp.service.js';

describe('Ethereal SMTP Integration', () => {
  it('should automatically connect to Ethereal SMTP and send an email successfully', async () => {
    const result = await sendEmail({
      to: 'recipient-test@example.com',
      subject: 'ReachInbox Automated Test Email',
      body: '<h1>Welcome to ReachInbox</h1><p>This is a real test email sent via Ethereal SMTP.</p>',
    });

    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
    expect(typeof result.messageId).toBe('string');
    expect(result.previewUrl).toBeDefined();
    console.log('Ethereal Email Dispatch Verified. Message ID:', result.messageId);
    console.log('Preview URL:', result.previewUrl);
  }, 30000);
});
