import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

interface IBlockedEvent {
  url: string;
  count: number;
}

interface IAdblockModule {
  addListener(event: 'onBlocked', listener: (event: IBlockedEvent) => void): EventSubscription;
  setEnabled(enabled: boolean): void;
  getStatus(): { ready: boolean; enabled: boolean };
  refreshLists(): void;
}

const native = requireNativeModule<IAdblockModule>('ActunimeAdblock');

/** Bloqueur de pubs et de pisteurs de la WebView (moteur de Brave) : état, activation et compteur par page. */
export const Adblock = {
  setEnabled: (enabled: boolean) => native.setEnabled(enabled),
  getStatus: () => native.getStatus(),
  refreshLists: () => native.refreshLists(),
  onBlocked: (listener: (event: IBlockedEvent) => void) => native.addListener('onBlocked', listener),
};
