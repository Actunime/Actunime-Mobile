import { describe, expect, it } from 'vitest';

import type { IBillingStatus } from './billing-model';
import { supportBenefits, supportMode, supportStatusLine } from './support';

const status = (patch: Partial<IBillingStatus>): IBillingStatus => ({ enabled: true, open: true, canUse: true, isSupporter: true, supporterSince: null, until: null, subscription: null, passUntil: null, ...patch });
const date = (v: string) => (v ? `le ${v.slice(0, 10)}` : null);

describe('supportMode', () => {
  it('rien à vendre tant que ce n’est pas ouvert, sauf à un administrateur', () => {
    expect(supportMode({ open: false, enabled: true }, status({ canUse: false }))).toBe('soon');
    expect(supportMode({ open: false, enabled: true }, status({ canUse: true }))).toBe('preview');
    expect(supportMode({ open: true, enabled: true }, undefined)).toBe('open');
    expect(supportMode({ open: true, enabled: false }, undefined)).toBe('unconfigured');
    expect(supportMode(undefined, undefined)).toBe('soon');
  });
});

describe('supportStatusLine', () => {
  it('décrit abonnement actif, résilié, pass', () => {
    expect(supportStatusLine(status({ isSupporter: false }), date)).toBeNull();
    expect(supportStatusLine(status({ subscription: { status: 'active', currentPeriodEnd: '2026-12-01T00:00:00Z', cancelAtPeriodEnd: false } }), date)).toMatch(/renouvelé/);
    expect(supportStatusLine(status({ subscription: { status: 'active', currentPeriodEnd: '2026-12-01T00:00:00Z', cancelAtPeriodEnd: true } }), date)).toMatch(/résilié/);
    expect(supportStatusLine(status({ passUntil: '2027-01-01T00:00:00Z' }), date)).toMatch(/Pass actif/);
  });

  it('liste les avantages dans l’ordre des paliers', () => {
    const list = supportBenefits();
    expect(list[0].perk).toBe('signature');
    expect(list.at(-1)?.perk).toBe('hideSponsored');
  });
});
