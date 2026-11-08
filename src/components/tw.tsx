import { Text, type TextProps } from 'react-native';

import { usePalette } from '@/components/theme-context';
import { Fonts, Tw } from '@/constants/theme';
import { nativeFontFamily, themedColor } from '@/lib/palette';

export type TwTextSize = keyof typeof Tw.text;
export type TwWeight = 'normal' | 'medium' | 'semibold' | 'bold';

const FAMILY: Record<TwWeight, string> = {
  normal: Fonts.regular,
  medium: Fonts.medium,
  semibold: Fonts.semibold,
  bold: Fonts.bold,
};

interface ITxtProps extends TextProps {
  /** `text-xs`, `text-sm`… du site (taille et hauteur de ligne de Tailwind). */
  size?: TwTextSize;
  /** `font-medium`, `font-semibold`… (Android ne gère pas `fontWeight` sur une police personnalisée). */
  weight?: TwWeight;
  color?: string;
  /** `uppercase` / `tracking-wider`. */
  upper?: boolean;
  tracking?: number;
  /** `tabular-nums`. */
  tabular?: boolean;
  /** `leading-snug` (1,375) / `leading-tight` (1,25) / `leading-none` (1). */
  leading?: number;
}

/** Texte à l'échelle du site : `<Txt size="xs" weight="semibold">` = `text-xs font-semibold`. */
export function Txt({
  size = 'sm',
  weight = 'normal',
  color,
  upper,
  tracking,
  tabular,
  leading,
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: Readonly<ITxtProps>) {
  const scale = Tw.text[size];
  const palette = usePalette();
  const family = nativeFontFamily(palette.font);
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: family ?? FAMILY[weight],
          ...(family ? { fontWeight: weight === 'bold' ? '700' : weight === 'semibold' ? '600' : weight === 'medium' ? '500' : '400' } : null),
          fontSize: scale.fontSize,
          lineHeight: leading ? Math.round(scale.fontSize * leading) : scale.lineHeight,
          color: themedColor(color, palette),
        },
        upper && { textTransform: 'uppercase' },
        tracking !== undefined && { letterSpacing: tracking },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}
