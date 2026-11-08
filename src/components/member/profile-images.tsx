import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Camera, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { StatusNote } from '@/components/settings/settings-ui';
import { errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import type { IProfileImageType } from '@/lib/image-data';
import { pickImage } from '@/lib/image-picker';

const LABELS: Record<IProfileImageType, { title: string; hint: string }> = {
  AVATAR: { title: 'Photo de profil', hint: 'Une image carrée, que tu recadres en la choisissant.' },
  BANNER: { title: 'Bannière', hint: 'Une image large (2560×1024), que tu recadres en la choisissant.' },
};

/** Changer ou retirer ma photo de profil ou ma bannière : même appels et mêmes rafraîchissements que le site. */
export function useProfileImage(type: IProfileImageType) {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['me'] });
    void client.invalidateQueries({ queryKey: ['member'] });
    void client.invalidateQueries({ queryKey: ['members'] });
  };
  const change = useMutation({
    mutationFn: async () => {
      const file = await pickImage(type);
      if (!file) return null;
      return api.updateMyImage(type, file);
    },
    onSuccess: (done) => {
      if (done !== null) refresh();
      // Les images animées sont réservées aux Supporters : le serveur n'en garde que la première image.
      if ((done as { animationFrozen?: boolean } | null)?.animationFrozen) Alert.alert('Image animée', 'Les images animées sont réservées aux Supporters : seule la première image a été gardée.');
    },
  });
  const remove = useMutation({ mutationFn: () => api.deleteMyImage(type), onSuccess: refresh });
  return { change, remove, busy: change.isPending || remove.isPending, error: change.error ?? remove.error };
}

/** Bloc de réglages d'une image : aperçu, choisir, retirer. */
export function ProfileImageField({ type, uri }: Readonly<{ type: IProfileImageType; uri?: string | null }>) {
  const { change, remove, busy, error } = useProfileImage(type);
  const label = LABELS[type];
  const askRemove = () => Alert.alert(`Retirer ${type === 'AVATAR' ? 'ta photo' : 'ta bannière'} ?`, undefined, [{ text: 'Annuler', style: 'cancel' }, { text: 'Retirer', style: 'destructive', onPress: () => remove.mutate() }]);
  return (
    <View style={styles.field}>
      <Txt size="sm" weight="semibold">
        {label.title}
      </Txt>
      <View style={[styles.preview, type === 'AVATAR' ? styles.avatar : styles.banner]}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Camera size={24} color={Tw.color.mutedForeground} />}</View>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label.hint}
      </Txt>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button label={busy ? 'Envoi…' : uri ? 'Changer' : 'Choisir une image'} disabled={busy} onPress={() => change.mutate()} />
        </View>
        {uri ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${label.title.toLowerCase()}`} disabled={busy} onPress={askRemove} style={styles.trash}>
            <Trash2 size={20} color={Tw.color.destructive} />
          </Pressable>
        ) : null}
      </View>
      {error ? <StatusNote tone="error">{errorMessage(error)}</StatusNote> : null}
    </View>
  );
}

/** Bouton « Modifier » posé sur ma photo ou ma bannière, sur mon profil. */
export function ProfileImageEditButton({ type, label }: Readonly<{ type: IProfileImageType; label: string }>) {
  const { change, remove, busy } = useProfileImage(type);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={() =>
        Alert.alert(LABELS[type].title, undefined, [
          { text: 'Choisir une image', onPress: () => change.mutate() },
          { text: 'Retirer', style: 'destructive', onPress: () => remove.mutate() },
          { text: 'Annuler', style: 'cancel' },
        ])
      }
      style={styles.edit}
    >
      <Camera size={14} color="#ffffff" />
      <Txt size="xs" weight="semibold" color="#ffffff">
        {busy ? 'Envoi…' : label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: 8 },
  preview: { overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 96, height: 96, borderRadius: Tw.radius.lg },
  banner: { width: '100%', aspectRatio: 2.5, borderRadius: Tw.radius.lg },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trash: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Tw.radius.lg, backgroundColor: Tw.color.input },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: Tw.radius.md, backgroundColor: 'rgba(0,0,0,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
});
