import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { usePalette } from '@/components/theme-context';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
};

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const palette = usePalette();
  // Dans un thème, les surfaces de la charte prennent celles du membre : page, cartes (backgroundElement), creux (backgroundSelected).
  const themed = { background: palette.background, backgroundElement: palette.card, backgroundSelected: palette.muted } as Partial<Record<string, string>>;
  const color = !palette.isDefault && themed[type ?? 'background'] ? themed[type ?? 'background'] : theme[type ?? 'background'];

  return <View style={[{ backgroundColor: color }, style]} {...otherProps} />;
}
