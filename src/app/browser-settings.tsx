import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Colors, Floating, ScreenGutter, Spacing } from '@/constants/theme';
import { setBrowserSetting, useBrowserSettings, type IBrowserSettings } from '@/lib/browser-settings';
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
  rowText: { flex: 1, gap: Spacing.half },
});
