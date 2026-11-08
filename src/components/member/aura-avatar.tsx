import type { IMemberSignature } from '@actunime/types';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AvatarAura } from '@/components/member/avatar-aura';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { compactAura, resolveAura } from '@/lib/aura';
import { signatureRing } from '@/lib/signature';

/**
 * Avatar d'un membre dans une liste : photo ou initiale, liseré de sa signature et aura réduite (palier de
 * contribution ou style de Soutien) — la même vie que sur son profil, sans déborder sur la ligne voisine.
 */
export function AuraAvatar({
  uri,
  name,
  size,
  radius,
  signature,
  tier = 0,
  style,
}: Readonly<{ uri?: string | null; name: string; size: number; radius?: number; signature?: IMemberSignature | null; tier?: number; style?: StyleProp<ViewStyle> }>) {
  const corner = radius ?? Tw.radius.md;
  const aura = compactAura(resolveAura(signature, tier));
  return (
    <AvatarAura size={size} radius={corner} aura={aura} compact>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: corner }, signatureRing(signature), style]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Txt size={size > 36 ? 'base' : 'sm'} weight="bold" color={Tw.color.mutedForeground}>
            {name.slice(0, 1).toUpperCase()}
          </Txt>
        )}
      </View>
    </AvatarAura>
  );
}

const styles = StyleSheet.create({ avatar: { overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' } });
