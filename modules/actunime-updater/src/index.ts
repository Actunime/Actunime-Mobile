import { requireNativeModule } from 'expo-modules-core';

export interface IInstalledVersion {
  versionCode: number;
  versionName: string;
}

interface IUpdaterModule {
  getInstalled(): IInstalledVersion;
}

const native = requireNativeModule<IUpdaterModule>('ActunimeUpdater');

/** Version installée de l'app (le téléchargement et l'installation se font sur la page GitHub de la release). */
export const Updater = {
  getInstalled: () => native.getInstalled(),
};
