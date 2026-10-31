import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Colors, Floating, ScreenGutter, Spacing } from '@/constants/theme';
import { EPISODE_THRESHOLDS, setBrowserSetting, useBrowserSettings, type EpisodeEnd, type IBrowserSettings } from '@/lib/browser-settings';
import { clearHistory } from '@/lib/browsing';

interface IRowProps {
  setting: keyof IBrowserSettings;
  label: string;
  hint?: string;
  value: boolean;
}

function SettingRow({ setting, label, hint, value }: Readonly<IRowProps>) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(next) => setBrowserSetting(setting, next)}
        trackColor={{ false: Colors.backgroundSelected, true: Colors.primary }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

interface IChoiceProps<T extends string | number> {
  label: string;
  hint?: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/** Choix parmi quelques valeurs, en pastilles (un réglage à trois états ne tient pas dans un interrupteur). */
function ChoiceRow<T extends string | number>({ label, hint, value, options, onChange }: Readonly<IChoiceProps<T>>) {
  return (
    <View style={styles.choice}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <ThemedText type="smallBold" style={selected ? styles.chipTextSelected : undefined}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const EPISODE_END_OPTIONS: ReadonlyArray<{ value: EpisodeEnd; label: string }> = [
  { value: 'auto', label: 'Automatique' },
  { value: 'ask', label: 'Je décide' },
  { value: 'off', label: 'Jamais' },
];

const confirmClear = () =>
  Alert.alert('Effacer l’historique ?', 'Les sites récents, tes sites épinglés et les dernières pages lues disparaissent. Ta liste n’est pas touchée.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Effacer', style: 'destructive', onPress: () => void clearHistory() },
  ]);

/** Réglages du navigateur : ce que l'app fait pendant la lecture et ce que l'accueil du navigateur affiche. */
export default function BrowserSettingsScreen() {
  const settings = useBrowserSettings();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            Réglages du navigateur
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Pendant la lecture</ThemedText>
          <View style={styles.card}>
            <SettingRow
              setting="adblock"
              label="Bloquer les publicités"
              hint="Bloque aussi les traqueurs ; la page se recharge quand tu changes ce réglage."
              value={settings.adblock}
            />
            <SettingRow
              setting="autoProgress"
              label="Mettre ma liste à jour à la fin"
              hint="À la fin d’un chapitre ou d’un épisode. Désactivé : tu touches « Marquer comme lu »."
              value={settings.autoProgress}
            />
            <SettingRow
              setting="fullscreen"
              label="Plein écran en lisant"
              hint="La barre d’outils se masque quand tu descends dans la page et revient quand tu remontes."
              value={settings.fullscreen}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Fin d’un épisode</ThemedText>
          <View style={styles.card}>
            <SettingRow
              setting="markPrevious"
              label="Compter le précédent en commençant la suite"
              hint="Quand une vidéo tourne depuis 30 s ou qu’un chapitre est lu à 15 %, les épisodes et chapitres d’avant passent en « vus » (œuvre déjà dans ta liste)."
              value={settings.markPrevious}
            />
            <ChoiceRow
              label="Quand la vidéo se termine"
              hint="Automatique : ta liste est mise à jour. Je décide : tu touches « Marquer comme lu ». Seules les vidéos de la page sont suivies ; un lecteur intégré d’un autre site demande « Marquer comme lu »."
              value={settings.episodeEnd}
              options={EPISODE_END_OPTIONS}
              onChange={(value) => setBrowserSetting('episodeEnd', value)}
            />
            {settings.episodeEnd !== 'off' ? (
              <ChoiceRow
                label="Compter l’épisode comme vu à"
                value={settings.episodeThreshold}
                options={EPISODE_THRESHOLDS.map((value) => ({ value, label: `${value} %` }))}
                onChange={(value) => setBrowserSetting('episodeThreshold', value)}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Accueil du navigateur</ThemedText>
          <View style={styles.card}>
            <SettingRow setting="showResume" label="Reprendre" hint="Tes œuvres en cours, à la dernière page lue." value={settings.showResume} />
            <SettingRow setting="showSites" label="Mes sites" value={settings.showSites} />
            <SettingRow setting="showRecent" label="Récents" value={settings.showRecent} />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Historique</ThemedText>
          <View style={styles.card}>
            <SettingRow
              setting="history"
              label="Garder mon historique"
              hint="Sites visités et dernière page lue de chaque œuvre, rien que sur ce téléphone. Désactivé : plus de « Reprendre » ni de sites récents."
              value={settings.history}
            />
            <Button label="Effacer l’historique" variant="outline" onPress={confirmClear} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: ScreenGutter, gap: Spacing.four, paddingBottom: Spacing.five },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  back: { width: 44, height: 44, marginLeft: -Spacing.two, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 28, lineHeight: 34 },
  section: { gap: Spacing.three },
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  choice: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 44, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.backgroundElement },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTextSelected: { color: Colors.primaryForeground },
  rowText: { flex: 1, gap: Spacing.half },
});
