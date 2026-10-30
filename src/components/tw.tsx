import { Text, type TextProps } from 'react-native';

import { Fonts, Tw } from '@/constants/theme';

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
  color = Tw.color.foreground,
  upper,
  tracking,
  tabular,
  leading,
  style,
  ...rest
}: Readonly<ITxtProps>) {
  const scale = Tw.text[size];
  return (
    <Text
      style={[
        {
          fontFamily: FAMILY[weight],
          fontSize: scale.fontSize,
          lineHeight: leading ? Math.round(scale.fontSize * leading) : scale.lineHeight,
          color,
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
