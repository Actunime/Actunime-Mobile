import { forwardRef } from 'react';
import { Pressable as RNPressable, type PressableProps, type View } from 'react-native';

import { alpha, Tw } from '@/constants/theme';

const RIPPLE = { color: alpha(Tw.color.foreground, 0.16), foreground: true } as const;

/**
 * `Pressable` de l'app : même retour tactile partout (ondulation Android au-dessus du contenu), sauf si l'écran
 * en demande un autre. Les styles `({ pressed })` continuent de fonctionner.
 */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({ android_ripple, ...rest }, ref) {
  return <RNPressable ref={ref} android_ripple={android_ripple ?? RIPPLE} {...rest} />;
});
