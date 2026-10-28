import { describe, expect, it, vi } from 'vitest';

import type { WebBrowserAuthSessionResult } from 'expo-web-browser';

import { CALLBACK_GRACE_MS, finishAuthSession } from './auth-session';

const outcome = (type: string, url?: string) => ({ type, url }) as unknown as WebBrowserAuthSessionResult;

describe('finishAuthSession', () => {
  it('renvoie l’URL d’un retour réussi sans attendre', async () => {
    const wait = vi.fn();

    await expect(finishAuthSession(outcome('success', 'actunime://auth/callback?code=c'), wait)).resolves.toBe(
      'actunime://auth/callback?code=c',
    );
    expect(wait).not.toHaveBeenCalled();
  });

  it('sur dismiss, attend l’URL de retour pendant le délai de grâce et la renvoie si elle arrive', async () => {
    const wait = vi.fn().mockResolvedValue('actunime://auth/callback?code=late');

    await expect(finishAuthSession(outcome('dismiss'), wait)).resolves.toBe('actunime://auth/callback?code=late');
    expect(wait).toHaveBeenCalledWith(CALLBACK_GRACE_MS);
  });

  it('sur dismiss sans URL à l’échéance, conclut à l’annulation', async () => {
    await expect(finishAuthSession(outcome('dismiss'), async () => null)).resolves.toBeNull();
  });

  it('sur annulation explicite, n’attend pas', async () => {
    const wait = vi.fn();

    await expect(finishAuthSession(outcome('cancel'), wait)).resolves.toBeNull();
    expect(wait).not.toHaveBeenCalled();
  });
});
