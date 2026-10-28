/**
 * Géométrie de l'éventail radial de la navigation mobile (fonctions pures, testées).
 *
 * L'éventail a deux arcs au-dessus du bouton central : 4 emplacements au plus sur l'arc proche, le reste
 * (jusqu'à 4) sur l'arc éloigné. Les coordonnées sont en pixels, relatives au centre du bouton, y vers le bas.
 */

export type FanRing = 'inner' | 'outer';

export interface IFanSlot {
  readonly x: number;
  readonly y: number;
  readonly ring: FanRing;
  /** Direction du centre vers l'emplacement, en degrés (0 = droite, 90 = haut). */
  readonly angle: number;
}

export const FAN_INNER_CAPACITY = 4;
/** L'arc éloigné se glisse dans les creux de l'arc proche : 3 creux, donc 3 actions au plus. */
export const FAN_OUTER_CAPACITY = FAN_INNER_CAPACITY - 1;
export const FAN_MAX_ITEMS = FAN_INNER_CAPACITY + FAN_OUTER_CAPACITY;

/** Taille d'un bouton d'action (px) et marge laissée entre deux boutons voisins. */
export const ACT_SIZE = 58;
/** Rayons des deux arcs (px). */
const INNER_RADIUS = 104;
const OUTER_RADIUS = 184;
/** Écart angulaire entre deux actions voisines de l'arc proche. */
const INNER_STEP_DEG = 41.5;

/** Zone morte autour du point d'appui : le doigt ne choisit rien tant qu'il reste dedans. */
export const DEAD_ZONE_PX = 12;
/** Distance au point d'appui à partir de laquelle le doigt vise l'arc éloigné, et distance de retour. */
export const OUTER_ENTER_PX = 48;
export const OUTER_LEAVE_PX = 38;
/** Écart angulaire maximal entre la direction du doigt et un emplacement pour le viser. */
export const ANGLE_TOLERANCE_DEG = 30;
/** Marge qui garde l'emplacement déjà visé tant qu'un voisin n'est pas nettement plus proche. */
export const ANGLE_STICKY_DEG = 9;

function slotAt(angleDeg: number, radius: number, ring: FanRing): IFanSlot {
  const rad = (angleDeg * Math.PI) / 180;
  const x = -Math.cos(rad) * radius;
  const y = -Math.sin(rad) * radius;
  return { x, y, ring, angle: (Math.atan2(-y, x) * 180) / Math.PI };
}

/** `count` angles régulièrement espacés de `stepDeg`, centrés sur la verticale. */
function centeredAngles(count: number, stepDeg: number): number[] {
  return Array.from({ length: count }, (_, i) => 90 - (stepDeg * (count - 1)) / 2 + stepDeg * i);
}

/**
 * Emplacements d'un éventail de `count` actions (0 à 7), de gauche à droite. Jusqu'à 4 actions : un seul
 * arc. Au-delà, les 4 premières sont sur l'arc proche et les suivantes se glissent entre elles, un cran
 * plus loin : en quinconce, ce qui garde l'éventail compact.
 */
export function computeFanSlots(count: number): IFanSlot[] {
  const total = Math.max(0, Math.min(count, FAN_MAX_ITEMS));
  if (total <= FAN_INNER_CAPACITY) {
    const step = total <= 2 ? 44 : INNER_STEP_DEG * 0.96;
    return centeredAngles(total, step).map((angle) => slotAt(angle, INNER_RADIUS, 'inner'));
  }
  const inner = centeredAngles(FAN_INNER_CAPACITY, INNER_STEP_DEG).map((angle) => slotAt(angle, INNER_RADIUS, 'inner'));
  const gaps = centeredAngles(FAN_INNER_CAPACITY - 1, INNER_STEP_DEG);
  const outerCount = total - FAN_INNER_CAPACITY;
  // 1 action : le creux du milieu ; 2 : les creux des bords ; 3 : les trois.
  const chosen = outerCount === 1 ? [gaps[1]!] : outerCount === 2 ? [gaps[0]!, gaps[2]!] : gaps;
  return [...inner, ...chosen.map((angle) => slotAt(angle, OUTER_RADIUS, 'outer'))];
}

export interface ILabelSize {
  readonly w: number;
  readonly h: number;
}

export interface IPoint {
  readonly x: number;
  readonly y: number;
}

interface IRect {
  readonly l: number;
  readonly t: number;
  readonly r: number;
  readonly b: number;
}

const LABEL_GAP = 5;
/** Décalages latéraux essayés (fraction de la largeur du libellé), du plus petit au plus grand, vers l'intérieur puis l'extérieur. */
const SLIDE_STEPS = Array.from({ length: 14 }, (_, i) => (Math.floor(i / 2) + 1) * 0.05 * (i % 2 === 0 ? 1 : -1));
const LABEL_MARGIN = 2;
const LABEL_EDGE_PX = 8;
/** Les libellés restent au-dessus de la barre (le haut de la barre est à ~24 px au-dessus du centre). */
const LABEL_FLOOR_Y = -30;
const FAB_HALF = 40;

const overlaps = (a: IRect, b: IRect): boolean => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const rectAround = (c: IPoint, w: number, h: number, margin = 0): IRect => ({
  l: c.x - w / 2 - margin,
  r: c.x + w / 2 + margin,
  t: c.y - h / 2 - margin,
  b: c.y + h / 2 + margin,
});

/**
 * Centre du libellé de chaque action, relatif au centre du bouton central. Pour chaque libellé, on propose
 * plusieurs emplacements (vers l'extérieur, au-dessus, en dessous, de côté, éventuellement glissés) et on
 * cherche, par essais successifs, une combinaison où aucun libellé ne recouvre un bouton, un autre
 * libellé ou la barre, et où tous tiennent dans l'écran (décalés vers l'intérieur s'ils débordent).
 * Si aucune combinaison n'existe, chaque libellé prend l'emplacement le moins gênant.
 */
export function placeLabels(slots: readonly IFanSlot[], sizes: readonly ILabelSize[], viewportWidth: number): IPoint[] {
  const half = viewportWidth / 2 - LABEL_EDGE_PX;
  const obstacles: IRect[] = [
    ...slots.map((slot) => rectAround(slot, ACT_SIZE, ACT_SIZE, LABEL_MARGIN)),
    { l: -FAB_HALF, r: FAB_HALF, t: -FAB_HALF, b: FAB_HALF },
  ];
  const sizeAt = (index: number): ILabelSize => sizes[index] ?? { w: 0, h: 0 };

  const candidatesFor = (index: number): IPoint[] => {
    const slot = slots[index]!;
    const size = sizeAt(index);
    const radius = Math.hypot(slot.x, slot.y) || 1;
    const ux = slot.x / radius;
    const uy = slot.y / radius;
    const reach = ACT_SIZE / 2 + LABEL_GAP;
    const above = { x: slot.x, y: slot.y - reach - size.h / 2 };
    // Quand l'espace est compté (arc éloigné juste au-dessus), le libellé se colle presque au bouton.
    const aboveTight = { x: slot.x, y: slot.y - ACT_SIZE / 2 - (LABEL_MARGIN + 1) - size.h / 2 };
    const below = { x: slot.x, y: slot.y + reach + size.h / 2 };
    const outward = { x: slot.x + ux * reach + (ux * size.w) / 2, y: slot.y + uy * reach + (uy * size.h) / 2 };
    // Deux libellés voisins trop larges pour tenir côte à côte : le second monte d'une ligne.
    const aboveHigh = { x: above.x, y: above.y - size.h - LABEL_MARGIN };
    const towardCenter = slot.x > 0 ? -1 : 1;
    const slid = (base: IPoint) => SLIDE_STEPS.map((k) => ({ x: base.x + towardCenter * k * size.w, y: base.y }));
    // Au-dessus de son bouton d'abord (glissé de côté si besoin), en dessous seulement en dernier recours.
    const raw = [
      outward,
      above,
      aboveTight,
      ...slid(above),
      ...slid(aboveTight),
      aboveHigh,
      ...slid(aboveHigh),
      { x: slot.x - reach - size.w / 2, y: slot.y },
      { x: slot.x + reach + size.w / 2, y: slot.y },
      below,
      ...slid(below),
    ];
    // Décale vers l'intérieur ce qui déborde de l'écran.
    return raw.map((c) => {
      const left = c.x - size.w / 2;
      const right = c.x + size.w / 2;
      const shift = left < -half ? -half - left : right > half ? half - right : 0;
      return { x: c.x + shift, y: c.y };
    });
  };

  const candidates = slots.map((_, index) => candidatesFor(index));
  const rectOf = (index: number, center: IPoint) => rectAround(center, sizeAt(index).w, sizeAt(index).h);
  const padded = (r: IRect): IRect => ({
    l: r.l - LABEL_MARGIN,
    r: r.r + LABEL_MARGIN,
    t: r.t - LABEL_MARGIN,
    b: r.b + LABEL_MARGIN,
  });
  const collisions = (rect: IRect, placed: readonly IRect[]): number => {
    let count = rect.b > LABEL_FLOOR_Y ? 1 : 0;
    for (const obstacle of obstacles) if (overlaps(rect, obstacle)) count += 1;
    for (const other of placed) if (overlaps(rect, padded(other))) count += 1;
    return count;
  };

  // Les actions de l'arc proche, plus contraintes, choisissent en premier.
  const order = slots
    .map((_, index) => index)
    .sort((a, b) => Number(slots[a]!.ring === 'outer') - Number(slots[b]!.ring === 'outer'));

  const result: IPoint[] = slots.map((slot) => ({ x: slot.x, y: slot.y }));
  const placedRects: IRect[] = [];

  const search = (depth: number): boolean => {
    if (depth === order.length) return true;
    const index = order[depth]!;
    for (const center of candidates[index]!) {
      const rect = rectOf(index, center);
      if (collisions(rect, placedRects) > 0) continue;
      result[index] = center;
      placedRects.push(rect);
      if (search(depth + 1)) return true;
      placedRects.pop();
    }
    return false;
  };
  if (search(0)) return result;

  // Repli : au moins gênant, libellé par libellé.
  placedRects.length = 0;
  for (const index of order) {
    let best = candidates[index]![0]!;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const center of candidates[index]!) {
      const score = collisions(rectOf(index, center), placedRects);
      if (score < bestScore) {
        bestScore = score;
        best = center;
      }
    }
    result[index] = best;
    placedRects.push(rectOf(index, best));
  }
  return result;
}

export interface IPickInput {
  /** Déplacement du doigt depuis son point d'appui, en pixels, y vers le bas. */
  readonly dx: number;
  readonly dy: number;
  readonly slots: readonly IFanSlot[];
  /** Arc actuellement visé (conservé entre deux appels pour l'hystérésis). */
  readonly ring: FanRing;
  /** Indice de l'action actuellement visée, s'il y en a une. */
  readonly hotIndex: number | null;
}

export interface IPickResult {
  readonly index: number | null;
  readonly ring: FanRing;
}

/**
 * Action visée par le doigt sans qu'il quitte le bouton : la direction choisit l'action, la distance
 * choisit l'arc. Zone morte au centre, seuils d'arc avec hystérésis, action déjà visée conservée.
 */
export function pickSlot({ dx, dy, slots, ring, hotIndex }: IPickInput): IPickResult {
  const dist = Math.hypot(dx, dy);
  if (dist < DEAD_ZONE_PX) return { index: null, ring };

  const hasOuter = slots.some((slot) => slot.ring === 'outer');
  let nextRing: FanRing = ring;
  if (!hasOuter) nextRing = 'inner';
  else if (ring === 'inner' && dist >= OUTER_ENTER_PX) nextRing = 'outer';
  else if (ring === 'outer' && dist < OUTER_LEAVE_PX) nextRing = 'inner';

  const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  let best: number | null = null;
  let bestGap = ANGLE_TOLERANCE_DEG;
  slots.forEach((slot, index) => {
    if (slot.ring !== nextRing) return;
    const gap = Math.abs(angle - slot.angle);
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  });

  if (hotIndex !== null && best !== null && best !== hotIndex) {
    const hot = slots[hotIndex];
    if (hot && hot.ring === nextRing && Math.abs(angle - hot.angle) < bestGap + ANGLE_STICKY_DEG) {
      return { index: hotIndex, ring: nextRing };
    }
  }
  return { index: best, ring: nextRing };
}
