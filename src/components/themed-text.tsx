import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { usePalette } from '@/components/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { themedColor } from '@/lib/palette';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'link';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const palette = usePalette();
  const color = themedColor(theme[themeColor ?? (type === 'link' ? 'primary' : 'text')], palette);

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 24 },
  title: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38 },
  subtitle: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 26 },
  small: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20 },
  link: { fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 20 },
});
