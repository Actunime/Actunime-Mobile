import { StyleSheet } from 'react-native';
import { usePalette } from '@/components/theme-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Reflet des cartes : un voile du bleu des champs (jamais de blanc, qui délave la carte) qui s'estompe vers le bas.
 * À placer en premier enfant d'une carte `Floating` (qui coupe ce qui dépasse de ses coins).
 */
export function Sheen() {
  const { input } = usePalette();
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={input} stopOpacity={0.55} />
          <Stop offset="0.5" stopColor={input} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="1" height="1" fill="url(#sheen)" />
    </Svg>
  );
}
