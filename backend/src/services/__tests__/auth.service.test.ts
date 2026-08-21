import { describe, it, expect } from 'vitest';
import { AuthService } from '../auth.service.js';

describe('AuthService (JWT & Authentication)', () => {
  it('should generate a valid JWT token and verify its payload', () => {
    const user = {
      id: 'test-user-123',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
    };

    const token = AuthService.generateToken(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = AuthService.verifyToken(token);
    expect(decoded.userId).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.name).toBe(user.name);
  });

  it('should reject invalid or tampered tokens', () => {
    expect(() => AuthService.verifyToken('invalid.jwt.token')).toThrow();
  });
});
