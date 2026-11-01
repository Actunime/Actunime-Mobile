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
  | { status: 'downloading'; info: IReleaseInfo; downloaded: number; total: number }
  | { status: 'ready'; info: IReleaseInfo; path: string }
  | { status: 'installing'; info: IReleaseInfo }
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

/** Télécharge l'APK (empreinte vérifiée). */
export async function downloadUpdate(info: IReleaseInfo): Promise<string | null> {
  set({ status: 'downloading', info, downloaded: 0, total: -1 });
  const subscription = Updater.onProgress(({ downloaded, total }) => set({ status: 'downloading', info, downloaded, total }));
  try {
    const path = await Updater.download(info.apkUrl, info.sha256);
    set({ status: 'ready', info, path });
    return path;
  } catch (error) {
    set({ status: 'error', message: messageOf(error), info });
    return null;
  } finally {
    subscription.remove();
  }
}

/**
 * Autre voie, sans aucune autorisation : ouvre la page de la release sur GitHub, le membre télécharge l'APK et
 * l'installe avec son navigateur.
 */
export async function openUpdatePage(info: IReleaseInfo): Promise<void> {
  try {
    await Linking.openURL(info.pageUrl);
  } catch (error) {
    set({ status: 'error', message: messageOf(error), info });
  }
}

/**
 * Installe l'APK téléchargé. Android demande d'abord d'autoriser cette app à installer des APK (une fois) : on
 * l'explique, puis on ouvre le bon écran ; l'utilisateur revient et touche « Installer » de nouveau.
 */
export async function installUpdate(info: IReleaseInfo, path: string): Promise<void> {
  if (!Updater.canInstall()) {
    Alert.alert(
      'Autoriser l’installation',
      'Pour se mettre à jour, Actunime doit être autorisée à installer des applications. Active « Autoriser depuis cette source », puis reviens et touche « Installer ».',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les réglages', onPress: () => Updater.openInstallSettings() },
      ],
    );
    return;
  }
  set({ status: 'installing', info });
  try {
    await Updater.install(path);
    // « user-action » : Android affiche sa confirmation ; « installed » : l'app est déjà remplacée
    set({ status: 'ready', info, path });
  } catch (error) {
    set({ status: 'error', message: messageOf(error), info });
  }
}

let launchChecked = false;

/**
 * Au lancement, au plus une fois par jour (et seulement si les mises à jour automatiques sont actives) : cherche une
 * nouvelle version, la télécharge, puis propose de l'installer. Jamais bloquant : « Plus tard » laisse l'app utilisable,
 * et la version reste proposée dans le Profil.
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
  const path = await downloadUpdate(info);
  if (!path) return;
  Alert.alert('Mise à jour prête', `La version ${info.version} est téléchargée.${info.notes ? `\n\n${info.notes}` : ''}`, [
    { text: 'Plus tard', style: 'cancel' },
    { text: 'Page GitHub', onPress: () => void openUpdatePage(info) },
    { text: 'Installer', onPress: () => void installUpdate(info, path) },
  ]);
}
