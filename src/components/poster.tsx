import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

interface IPosterProps {
  uri?: string | null;
  width: number;
  style?: StyleProp<ViewStyle>;
}

/** Affiche d'œuvre au ratio 2:3 ; un aplat de la charte tient la place d'une affiche absente ou en cours de chargement. */
export function Poster({ uri, width, style }: Readonly<IPosterProps>) {
  return (
    <View style={[styles.frame, { width, height: Math.round(width * 1.5) }, style]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.small, backgroundColor: Colors.backgroundSelected, overflow: 'hidden' },
});
