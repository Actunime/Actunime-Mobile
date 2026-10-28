import { describe, it, expect } from 'vitest';
import {
  ANGLE_TOLERANCE_DEG,
  DEAD_ZONE_PX,
  FAN_MAX_ITEMS,
  OUTER_ENTER_PX,
  OUTER_LEAVE_PX,
  ACT_SIZE,
  computeFanSlots,
  pickSlot,
  placeLabels,
} from './radial-layout';
import { MEMBER_FAN, type IMobileNavItem } from './mobile-nav.config';

describe('computeFanSlots', () => {
  it('place au plus 4 actions sur l’arc proche, le reste sur l’arc éloigné', () => {
    expect(computeFanSlots(3).every((slot) => slot.ring === 'inner')).toBe(true);
    const slots = computeFanSlots(7);
    expect(slots.filter((slot) => slot.ring === 'inner')).toHaveLength(4);
    expect(slots.filter((slot) => slot.ring === 'outer')).toHaveLength(3);
  });

  it('plafonne à 8 actions et ne plante pas à 0', () => {
    expect(computeFanSlots(20)).toHaveLength(FAN_MAX_ITEMS);
    expect(FAN_MAX_ITEMS).toBe(7);
    expect(computeFanSlots(0)).toEqual([]);
  });

  it('range chaque arc de gauche à droite, au-dessus du bouton', () => {
    const slots = computeFanSlots(7);
    for (const ring of ['inner', 'outer'] as const) {
      const xs = slots.filter((slot) => slot.ring === ring).map((slot) => slot.x);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    }
    expect(slots.every((slot) => slot.y < 0)).toBe(true);
  });

  it('place une action unique droit au-dessus', () => {
    const [slot] = computeFanSlots(1);
    expect(slot!.x).toBeCloseTo(0);
    expect(slot!.angle).toBeCloseTo(90);
  });

  it('l’arc éloigné est plus loin du centre que l’arc proche', () => {
    const slots = computeFanSlots(7);
    const radius = (ring: 'inner' | 'outer') =>
      Math.hypot(
        ...(slots
          .filter((slot) => slot.ring === ring)
          .map((slot) => [slot.x, slot.y])
          .at(0) as [number, number])
      );
    expect(radius('outer')).toBeGreaterThan(radius('inner'));
  });
});

describe('pickSlot', () => {
  const slots = computeFanSlots(7);
  const innerLeft = slots.findIndex((slot) => slot.ring === 'inner');
  const outerMiddle = slots.findIndex((slot) => slot.ring === 'outer') + 1;

  it('ne vise rien dans la zone morte', () => {
    const result = pickSlot({ dx: 3, dy: -DEAD_ZONE_PX + 4, slots, ring: 'inner', hotIndex: null });
    expect(result.index).toBeNull();
  });

  it('vise l’action dans la direction du doigt, sans quitter le bouton', () => {
    const target = slots[innerLeft]!;
    const result = pickSlot({
      dx: Math.cos((target.angle * Math.PI) / 180) * 30,
      dy: -Math.sin((target.angle * Math.PI) / 180) * 30,
      slots,
      ring: 'inner',
      hotIndex: null,
    });
    expect(result.index).toBe(innerLeft);
    expect(result.ring).toBe('inner');
  });

  it('passe sur l’arc éloigné dès OUTER_ENTER_PX et en revient sous OUTER_LEAVE_PX', () => {
    const straightUp = (distance: number, ring: 'inner' | 'outer') =>
      pickSlot({ dx: 0, dy: -distance, slots, ring, hotIndex: null });
    expect(straightUp(OUTER_ENTER_PX - 1, 'inner').ring).toBe('inner');
    const entered = straightUp(OUTER_ENTER_PX, 'inner');
    expect(entered.ring).toBe('outer');
    expect(entered.index).toBe(outerMiddle);
    // Hystérésis : entre les deux seuils, l'arc déjà visé est conservé.
    expect(straightUp((OUTER_ENTER_PX + OUTER_LEAVE_PX) / 2, 'outer').ring).toBe('outer');
    expect(straightUp((OUTER_ENTER_PX + OUTER_LEAVE_PX) / 2, 'inner').ring).toBe('inner');
    expect(straightUp(OUTER_LEAVE_PX - 1, 'outer').ring).toBe('inner');
  });

  it('ne vise rien quand le doigt part vers le bas (hors de l’éventail)', () => {
    const result = pickSlot({ dx: 0, dy: 60, slots, ring: 'inner', hotIndex: null });
    expect(result.index).toBeNull();
  });

  it('reste sur l’arc proche quand l’éventail n’a pas d’arc éloigné', () => {
    const few = computeFanSlots(3);
    expect(pickSlot({ dx: 0, dy: -200, slots: few, ring: 'inner', hotIndex: null }).ring).toBe('inner');
  });

  it('garde l’action déjà visée tant que sa voisine n’est pas nettement plus proche', () => {
    const a = slots[1]!;
    const b = slots[2]!;
    const middle = (a.angle + b.angle) / 2;
    const toward = (angle: number) => ({
      dx: Math.cos((angle * Math.PI) / 180) * 30,
      dy: -Math.sin((angle * Math.PI) / 180) * 30,
    });
    // Juste du côté de b, mais a était déjà visée : elle est conservée.
    const sticky = pickSlot({ ...toward(middle - 1), slots, ring: 'inner', hotIndex: 2 });
    expect(sticky.index).toBe(2);
    // Sans action déjà visée, c'est la plus proche.
    const fresh = pickSlot({ ...toward(middle - 1), slots, ring: 'inner', hotIndex: null });
    expect(fresh.index).toBe(2);
    expect(ANGLE_TOLERANCE_DEG).toBeGreaterThan(0);
  });
});

describe('écartement des actions', () => {
  const BUTTON = ACT_SIZE;
  it('aucun bouton ne touche son voisin, quel que soit le nombre d’actions', () => {
    for (let count = 2; count <= FAN_MAX_ITEMS; count++) {
      const slots = computeFanSlots(count);
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const gap = Math.hypot(slots[i]!.x - slots[j]!.x, slots[i]!.y - slots[j]!.y) - BUTTON;
          expect(gap, `${count} actions : ${i} et ${j}`).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });

  it('les actions de l’arc éloigné se glissent entre celles de l’arc proche', () => {
    const slots = computeFanSlots(6);
    const inner = slots.filter((slot) => slot.ring === 'inner').map((slot) => slot.angle);
    const [left, right] = slots.filter((slot) => slot.ring === 'outer');
    // Connexion entre la 1re et la 2e, Inscription entre la 3e et la 4e.
    expect(left!.angle).toBeGreaterThan(inner[1]!);
    expect(left!.angle).toBeLessThan(inner[0]!);
    expect(right!.angle).toBeGreaterThan(inner[3]!);
    expect(right!.angle).toBeLessThan(inner[2]!);
  });

  it('tient dans un écran de 320 px', () => {
    for (let count = 1; count <= FAN_MAX_ITEMS; count++) {
      for (const slot of computeFanSlots(count)) {
        expect(Math.abs(slot.x) + BUTTON / 2).toBeLessThanOrEqual(160 - 6);
      }
    }
  });
});

describe('placeLabels', () => {
  // Largeur estimée d'un libellé en 12 px gras : ~6,6 px par lettre + 16 px de marge.
  const sizeOf = (label: string) => ({ w: Math.round(label.length * 6.6 + 16), h: 22 });
  const rect = (c: { x: number; y: number }, w: number, h: number) => ({
    l: c.x - w / 2,
    r: c.x + w / 2,
    t: c.y - h / 2,
    b: c.y + h / 2,
  });
  const hit = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) =>
    a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

  // Tous les éventails réels de l'application : les deux racines et chaque sous-menu.
  const fans: { name: string; labels: string[] }[] = [];
  const collect = (name: string, items: readonly IMobileNavItem[]) => {
    fans.push({ name, labels: items.map((entry) => entry.label) });
    items.forEach((entry) => entry.children && collect(`${name} › ${entry.label}`, entry.children));
  };
  collect('membre', MEMBER_FAN);

  for (const viewport of [320, 360, 430]) {
    it(`aucun libellé ne recouvre un bouton, un autre libellé, la barre ou le bord (écran de ${viewport} px)`, () => {
      for (const { name, labels: texts } of fans) {
        const slots = computeFanSlots(texts.length);
        const sizes = texts.map(sizeOf);
        const labels = placeLabels(slots, sizes, viewport).map((c, i) => rect(c, sizes[i]!.w, sizes[i]!.h));
        labels.forEach((label, i) => {
          const where = `${name}, « ${texts[i]} »`;
          expect(label.l, where).toBeGreaterThanOrEqual(-viewport / 2 + 7);
          expect(label.r, where).toBeLessThanOrEqual(viewport / 2 - 7);
          expect(label.b, where).toBeLessThanOrEqual(-29);
          slots.forEach((slot, j) => {
            expect(hit(label, rect(slot, ACT_SIZE, ACT_SIZE)), `${where} sur le bouton « ${texts[j]} »`).toBe(false);
          });
          labels.forEach((other, j) => {
            if (j > i) expect(hit(label, other), `${where} sur le libellé « ${texts[j]} »`).toBe(false);
          });
        });
      }
    });
  }
});

describe('placeLabels : côté du bouton', () => {
  const sizeOf = (label: string) => ({ w: Math.round(label.length * 6.6 + 16), h: 22 });
  const fans: { name: string; labels: string[] }[] = [];
  const collect = (name: string, items: readonly IMobileNavItem[]) => {
    fans.push({ name, labels: items.map((entry) => entry.label) });
    items.forEach((entry) => entry.children && collect(`${name} › ${entry.label}`, entry.children));
  };
  collect('membre', MEMBER_FAN);

  for (const viewport of [360, 390, 430]) {
    it(`aucun libellé n'est sous son bouton, vers la barre où il se lirait sur un autre (écran de ${viewport} px)`, () => {
      for (const { name, labels: texts } of fans) {
        const slots = computeFanSlots(texts.length);
        placeLabels(slots, texts.map(sizeOf), viewport).forEach((center, i) => {
          expect(center.y, `${name}, « ${texts[i]} »`).toBeLessThanOrEqual(slots[i]!.y);
        });
      }
    });
  }
});
