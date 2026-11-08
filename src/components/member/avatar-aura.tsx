import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { alpha } from '@/constants/theme';
import type { IAuraSpec } from '@/lib/aura';

/** Boucle 0 → 1 en continu (`delay` négatif de CSS : on décale le départ, la boucle reste la même). */
function useLoop(duration: number, delay = 0, easing: (t: number) => number = Easing.linear) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing }), -1, false));
    return () => cancelAnimation(value);
  }, [value, duration, delay, easing]);
  return value;
}

/** Une lumière sur une orbite autour de la photo (`radius` en dp depuis le centre). */
function OrbitDot({ radius, size, color, period, phase, glow }: Readonly<{ radius: number; size: number; color: string; period: number; phase: number; glow: number }>) {
  const t = useLoop(period, 0);
  const style = useAnimatedStyle(() => {
    const angle = (t.value + phase) * Math.PI * 2;
    return { transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }] };
  });
  return <Animated.View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color, shadowOpacity: 1, shadowRadius: glow, elevation: 0 }, style]} />;
}

/** Étoile qui scintille : apparaît, grossit un peu, s'efface. */
function Twinkle({ x, y, color, delay, size }: Readonly<{ x: number; y: number; color: string; delay: number; size: number }>) {
  const t = useLoop(2400, delay);
  const style = useAnimatedStyle(() => {
    const k = t.value < 0.5 ? t.value * 2 : (1 - t.value) * 2;
    return { opacity: k, transform: [{ translateX: x }, { translateY: y }, { scale: 0.5 + k * 0.7 }, { rotate: '45deg' }] };
  });
  return <Animated.View style={[styles.center, { width: size, height: size, backgroundColor: color, borderRadius: 1, shadowColor: color, shadowOpacity: 1, shadowRadius: 4 }, style]} />;
}

/** Particule qui monte le long de la photo et s'efface (braise, pétale, étincelle). */
function Riser({ x, base, rise, color, delay, size }: Readonly<{ x: number; base: number; rise: number; color: string; delay: number; size: number }>) {
  const t = useLoop(3600, delay);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateX: x + Math.sin(t.value * Math.PI * 2) * 4 }, { translateY: base - t.value * rise }, { scale: 1 - t.value * 0.5 }],
  }));
  return <Animated.View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/** Anneau qui respire derrière la photo : la base de toutes les auras. */
function Ring({ box, radius, color, min, max, period, thickness = 2, delay = 0 }: Readonly<{ box: number; radius: number; color: string; min: number; max: number; period: number; thickness?: number; delay?: number }>) {
  const t = useLoop(period, delay, Easing.inOut(Easing.sin));
  const style = useAnimatedStyle(() => {
    const k = t.value < 0.5 ? t.value * 2 : (1 - t.value) * 2;
    return { opacity: min + (max - min) * k, transform: [{ scale: 1 + k * 0.05 }] };
  });
  return <Animated.View style={[styles.center, { width: box, height: box, borderRadius: radius, borderWidth: thickness, borderColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 10 }, style]} />;
}

/** Cercle qui s'ouvre une fois à l'arrivée sur l'écran. */
function Burst({ box, radius, color }: Readonly<{ box: number; radius: number; color: string }>) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(200, withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.8 * (1 - t.value), transform: [{ scale: 1 + t.value * 0.5 }] }));
  return <Animated.View style={[styles.center, { width: box, height: box, borderRadius: radius, borderWidth: 2, borderColor: color }, style]} />;
}

/** Anneau en pointillés qui tourne lentement : les rayons de l'aura. */
function Rays({ box, radius, color }: Readonly<{ box: number; radius: number; color: string }>) {
  const t = useLoop(14000);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return <Animated.View style={[styles.center, { width: box, height: box, borderRadius: radius, borderWidth: 2, borderStyle: 'dashed', borderColor: alpha(color, 0.55) }, style]} />;
}

/** Lueur d'aurore : le disque passe doucement d'une couleur à sa version claire. */
function Aurora({ box, radius, color }: Readonly<{ box: number; radius: number; color: string }>) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) })), -1, false);
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.18 + t.value * 0.22, transform: [{ scale: 1.05 + t.value * 0.1 }, { rotate: `${t.value * 25}deg` }] }));
  return <Animated.View style={[styles.center, { width: box, height: box, borderRadius: radius, backgroundColor: color }, style]} />;
}

const TWINKLE_SPOTS: readonly (readonly [number, number])[] = [
  [-0.62, -0.58],
  [0.66, -0.5],
  [-0.66, 0.4],
  [0.6, 0.64],
  [0.1, -0.72],
  [-0.2, 0.74],
];

export interface IAvatarAuraProps {
  /** Côté de la photo en dp. */
  size: number;
  /** Rayon de coin de la photo (la moitié du côté pour un rond). */
  radius: number;
  aura: IAuraSpec | null;
  children: ReactNode;
}

/**
 * Photo de profil d'un membre de palier Pilier ou plus, ou Soutien avec une aura choisie : les effets des emblèmes de
 * la vitrine des paliers (anneau qui respire, éclat d'entrée, lumières en orbite, étoiles, braises et pétales),
 * posés autour de la photo et jamais dessus. Sans mouvement quand le système les réduit : un simple anneau.
 */
export function AvatarAura({ size, radius, aura, children }: Readonly<IAvatarAuraProps>) {
  const reduced = useReducedMotion();
  if (!aura) return <>{children}</>;
  const box = size + 10;
  const boxRadius = radius + 5;
  const orbitRadius = size * 0.62;
  // Marge qui réserve la place des effets (comètes à ~24 dp de la photo) : ils ne sortent ni de l'écran ni sur le voisin.
  const wrap: ViewStyle = { width: size, height: size, margin: 12 };

  return (
    <View style={wrap}>
      <View pointerEvents="none" style={styles.fx} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {reduced ? (
          <View style={[styles.center, { width: box, height: box, borderRadius: boxRadius, borderWidth: 2, borderColor: alpha(aura.color, 0.7) }]} />
        ) : (
          <>
            {aura.disc ? <View style={[styles.center, { width: size * 1.5, height: size * 1.5, borderRadius: size, backgroundColor: alpha(aura.color, 0.14) }]} /> : null}
            {aura.aurora ? <Aurora box={size * 1.45} radius={size * 0.75} color={aura.color} /> : null}
            <Ring box={box} radius={boxRadius} color={aura.color} min={0.25} max={0.7} period={3600} />
            {aura.halo ? <Ring box={size + 26} radius={radius + 13} color={aura.color} min={0.1} max={0.45} period={3600} thickness={1.5} delay={900} /> : null}
            {aura.frame ? <View style={[styles.center, { width: size + 18, height: size + 18, borderRadius: radius + 9, borderWidth: 1.5, borderColor: alpha(aura.color, 0.85) }]} /> : null}
            {aura.rays ? <Rays box={size + 34} radius={(size + 34) / 2} color={aura.color} /> : null}
            <Burst box={box} radius={boxRadius} color={aura.color} />
            {Array.from({ length: aura.orbit }, (_, i) => (
              <OrbitDot key={`o${i}`} radius={orbitRadius} size={5} color={aura.orbitColors[i % Math.max(aura.orbitColors.length, 1)] ?? aura.color} period={7000} phase={i / aura.orbit} glow={6} />
            ))}
            {Array.from({ length: aura.comets }, (_, i) => (
              <OrbitDot key={`c${i}`} radius={orbitRadius + 10 + i * 6} size={7} color="#ffffff" period={3800 + i * 900} phase={i * 0.5} glow={10} />
            ))}
            {Array.from({ length: aura.twinkles }, (_, i) => {
              const [fx, fy] = TWINKLE_SPOTS[i % TWINKLE_SPOTS.length];
              return <Twinkle key={`t${i}`} x={fx * size} y={fy * size} color={aura.color} delay={i * 450} size={6} />;
            })}
            {Array.from({ length: aura.risers }, (_, i) => (
              <Riser key={`r${i}`} x={((i + 0.5) / aura.risers - 0.5) * size * 1.1} base={size * 0.55} rise={size * 0.95} color={aura.riserColor} delay={i * 450} size={4} />
            ))}
          </>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Calque d'effets : centré sur la photo, il déborde sans rien couvrir (il est dessiné avant elle). */
  fx: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute' },
});
