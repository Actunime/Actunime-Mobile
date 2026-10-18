import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { LearnedPattern } from '@/detection/core/types';
import type { PageDetection } from '@/detection/messages';
import type { ISearchMedia } from '@/lib/api';
import { titleOf } from '@/lib/sync';
import type { INotice, TrackingState } from '@/lib/use-tracking';

interface ITrackingBarProps {
  tracking: TrackingState;
  notice: INotice | null;
  host: string;
  pattern: LearnedPattern | null;
  onMarkRead: () => void;
  onChoose: (media: ISearchMedia) => void;
  onChange: () => void;
  onSearch: () => void;
  onConfigure: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
}

const numberLabel = (d: PageDetection) => {
  const number = d.kind === 'manga' ? d.chapter : d.episode;
  return number === undefined ? null : `${d.kind === 'manga' ? 'Chapitre' : 'Épisode'} ${number}`;
};

/** Phrase d'aide de l'état « reconnu » : où en est la liste et ce qu'il reste à faire pour ce chapitre. */
function matchedHelp(tracking: Extract<TrackingState, { kind: 'matched' }>, pattern: LearnedPattern | null): string {
  const { detection, progress } = tracking;
  const manga = detection.kind === 'manga';
  const unit = manga ? 'chapitre' : 'épisode';
  const number = manga ? detection.chapter : detection.episode;
  if (progress !== undefined && number !== undefined && progress >= number) {
    return `Ton ${unit} ${number} est dans ta liste (tu es au ${unit} ${progress}).`;
  }
  const where = progress !== undefined ? `Dans ta liste : ${unit} ${progress}.` : 'Pas encore dans ta liste.';
  const auto = manga && pattern?.mangaTracking?.mode !== 'manual';
  return `${where} ${auto ? 'La progression est ajoutée quand tu arrives à la fin du chapitre.' : 'Touche « Marquer comme lu » quand tu as terminé.'}`;
}

const NOTICE_COLOR = { success: Colors.success, error: Colors.destructive, info: Colors.textSecondary } as const;

/**
 * Barre de suivi Actunime, toujours visible sous la page : c'est l'équivalent mobile du popup de l'extension.
 * Elle dit ce qui a été reconnu et propose la prochaine action à chaque état, y compris « rien détecté ».
 */
export function TrackingBar(props: ITrackingBarProps) {
  const { tracking, notice, host, pattern } = props;
  const [collapsed, setCollapsed] = useState(false);

  const title =
    tracking.kind === 'idle'
      ? 'Aucune œuvre détectée'
      : tracking.kind === 'resolving'
        ? 'Recherche sur Actunime…'
        : tracking.kind === 'confirm'
          ? 'Quelle œuvre est-ce ?'
          : tracking.kind === 'matched'
            ? tracking.match.title
            : 'Suivi désactivé';

  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <Pressable accessibilityRole="button" onPress={() => setCollapsed((value) => !value)} style={styles.header}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {title}
          </ThemedText>
          {'detection' in tracking && numberLabel(tracking.detection) && (
            <ThemedText type="small" themeColor="textSecondary">
              {numberLabel(tracking.detection)}
            </ThemedText>
          )}
        </View>
        {tracking.kind === 'resolving' && <ActivityIndicator color={Colors.primary} />}
        <Ionicons name={collapsed ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
      </Pressable>

      {notice && (
        <ThemedText type="small" style={{ color: NOTICE_COLOR[notice.tone] }}>
          {notice.text}
        </ThemedText>
      )}

      {!collapsed && (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {tracking.kind === 'idle' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Ouvre une page de chapitre ou d’épisode. Si Actunime ne la reconnaît pas toute seule, configure ce site
                : tu lui montres une fois où se trouvent le titre et le numéro.
              </ThemedText>
              <Button label={pattern ? 'Reconfigurer ce site' : 'Configurer ce site'} onPress={props.onConfigure} />
              <Button label="Chercher une œuvre à la main" variant="outline" onPress={props.onSearch} />
              <Pressable onPress={props.onIgnore}>
                <ThemedText type="link" themeColor="textSecondary">
                  Ne pas suivre {host || 'ce site'}
                </ThemedText>
              </Pressable>
            </>
          )}

          {tracking.kind === 'confirm' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Page détectée : « {tracking.detection.title} ». Choisis l’œuvre correspondante pour que le suivi
                s’active.
              </ThemedText>
              {tracking.candidates.map((media) => (
                <Pressable key={media.id ?? media._id} onPress={() => props.onChoose(media)} style={styles.candidate}>
                  <Image
                    source={media.posterUrl ? { uri: media.posterUrl } : undefined}
                    style={styles.poster}
                    contentFit="cover"
                  />
                  <ThemedText type="smallBold" style={styles.candidateTitle} numberOfLines={2}>
                    {titleOf(media)}
                  </ThemedText>
                </Pressable>
              ))}
              <Button label="Aucune de ces œuvres : chercher" variant="outline" onPress={props.onSearch} />
              <View style={styles.links}>
                <Pressable onPress={props.onConfigure}>
                  <ThemedText type="link">Le titre est faux : configurer ce site</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {tracking.kind === 'matched' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {matchedHelp(tracking, pattern)}
              </ThemedText>
              {numberLabel(tracking.detection) && <Button label="Marquer comme lu" onPress={props.onMarkRead} />}
              <View style={styles.links}>
                <Pressable onPress={props.onChange}>
                  <ThemedText type="link">Ce n’est pas la bonne œuvre</ThemedText>
                </Pressable>
                <Pressable onPress={props.onConfigure}>
                  <ThemedText type="link">Configurer ce site</ThemedText>
                </Pressable>
                <Pressable onPress={props.onIgnore}>
                  <ThemedText type="link" themeColor="textSecondary">
                    Ne pas suivre ce site
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}

          {tracking.kind === 'ignored' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Actunime ne suit pas {host || 'ce site'}.
              </ThemedText>
              <Button label="Réactiver le suivi" variant="outline" onPress={props.onUnignore} />
            </>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: { padding: Spacing.three, gap: Spacing.two, borderTopWidth: 1, borderTopColor: Colors.border, maxHeight: '45%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logo: { width: 22, height: 23 },
  headerText: { flex: 1 },
  body: { flexGrow: 0 },
  bodyContent: { gap: Spacing.two },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  poster: { width: 40, height: 56, borderRadius: Radius.small, backgroundColor: Colors.backgroundSelected },
  candidateTitle: { flex: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: Spacing.one },
});
