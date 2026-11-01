import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

export interface IInstalledVersion {
  versionCode: number;
  versionName: string;
}

interface IProgressEvent {
  downloaded: number;
  /** Taille totale en octets, `-1` quand le serveur ne la donne pas. */
  total: number;
}

interface IUpdaterModule {
  addListener(event: 'onProgress', listener: (event: IProgressEvent) => void): EventSubscription;
  getInstalled(): IInstalledVersion;
  canInstall(): boolean;
  openInstallSettings(): void;
  download(url: string, sha256: string): Promise<string>;
  install(path: string): Promise<'installed' | 'user-action'>;
}

const native = requireNativeModule<IUpdaterModule>('ActunimeUpdater');

/** Mise à jour de l'app par elle-même : version installée, autorisation d'installer, téléchargement vérifié, installation. */
export const Updater = {
  getInstalled: () => native.getInstalled(),
  canInstall: () => native.canInstall(),
  openInstallSettings: () => native.openInstallSettings(),
  /** Télécharge l'APK et vérifie son SHA-256 ; rejette `SHA_MISMATCH` si l'empreinte diffère. Renvoie le chemin du fichier. */
  download: (url: string, sha256: string) => native.download(url, sha256),
  /** Lance l'installation : `user-action` quand Android affiche sa confirmation. */
  install: (path: string) => native.install(path),
  onProgress: (listener: (event: IProgressEvent) => void) => native.addListener('onProgress', listener),
};
