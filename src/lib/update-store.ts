import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Alert, Linking } from 'react-native';

import { Updater } from '../../modules/actunime-updater/src';
import { UPDATES_URL } from './config';
import { fetchLatestRelease, isNewer, shouldCheck, type IReleaseInfo } from './updates';

const AUTO_KEY = 'actunime.updates.auto';
const LAST_CHECK_KEY = 'actunime.updates.lastCheck';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; info: IReleaseInfo }
  | { status: 'error'; message: string; info?: IReleaseInfo };

let state: UpdateState = { status: 'idle' };
let auto = true;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const set = (next: UpdateState) => {
  state = next;
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** État de la mise à jour (recherche, téléchargement, installation), partagé entre le lancement et l'écran Profil. */
export const useUpdateState = (): UpdateState => useSyncExternalStore(subscribe, () => state);
export const useAutoUpdate = (): boolean => useSyncExternalStore(subscribe, () => auto);

void AsyncStorage.getItem(AUTO_KEY)
  .then((raw) => {
    if (raw === 'false') auto = false;
    emit();
  })
  .catch(() => undefined);

export function setAutoUpdate(next: boolean): void {
  auto = next;
  emit();
  void AsyncStorage.setItem(AUTO_KEY, String(next)).catch(() => undefined);
}

export const installedVersion = () => Updater.getInstalled();

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Erreur inattendue');

/** Cherche une release plus récente que l'app installée. `silent` : au lancement, un échec ne s'affiche pas. */
export async function checkForUpdate({ silent = false }: { silent?: boolean } = {}): Promise<IReleaseInfo | null> {
  set({ status: 'checking' });
  try {
    const info = await fetchLatestRelease(UPDATES_URL);
    void AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => undefined);
    if (info && isNewer(info.versionCode, Updater.getInstalled().versionCode)) {
      set({ status: 'available', info });
      return info;
    }
    set({ status: 'up-to-date' });
    return null;
  } catch (error) {
    set(silent ? { status: 'idle' } : { status: 'error', message: messageOf(error) });
    return null;
  }
}

/**
 * Ouvre la page de la release sur GitHub : le membre y télécharge l'APK et l'installe avec son navigateur. L'app
 * n'installe rien elle-même, donc ne demande aucune autorisation « installer des applications ».
 */
export async function openUpdatePage(info: IReleaseInfo): Promise<void> {
  try {
    await Linking.openURL(info.pageUrl);
  } catch (error) {
    set({ status: 'error', message: messageOf(error), info });
  }
}

let launchChecked = false;

/**
 * Au lancement, au plus une fois par jour (et seulement si les mises à jour automatiques sont actives) : cherche une
 * nouvelle version et la signale. Jamais bloquant : « Plus tard » laisse l'app utilisable, et la version reste
 * proposée dans le Profil.
 */
export async function runLaunchCheck(): Promise<void> {
  if (launchChecked) return;
  launchChecked = true;
  await AsyncStorage.getItem(AUTO_KEY).then((raw) => {
    auto = raw !== 'false';
  });
  if (!auto) return;
  const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null)) || undefined;
  if (!shouldCheck(last, Date.now())) return;

  const info = await checkForUpdate({ silent: true });
  if (!info) return;
  Alert.alert('Nouvelle version', `La version ${info.version} est disponible.${info.notes ? `\n\n${info.notes}` : ''}`, [
    { text: 'Plus tard', style: 'cancel' },
    { text: 'Page de téléchargement', onPress: () => void openUpdatePage(info) },
  ]);
}
