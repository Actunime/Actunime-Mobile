import { describe, expect, it, vi } from 'vitest';

import { api } from './client';

vi.mock('./session', () => ({ getAccessToken: vi.fn(async () => 'jeton'), refreshSession: vi.fn() }));
vi.mock('./storage', () => ({ clearAuth: vi.fn() }));
vi.mock('./auth-store', () => ({ markSignedOut: vi.fn() }));

describe('client API partagé', () => {
  it("s'initialise avec les modules utilisés par l'app", () => {
    const client = api();
    expect(client.animes).toBeDefined();
    expect(client.lists).toBeDefined();
    expect(client.getHttp().defaults.withCredentials).toBe(false);
  });
});
