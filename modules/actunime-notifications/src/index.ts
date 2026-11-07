import { requireNativeModule } from 'expo-modules-core';

export interface IPhoneNotificationsStatus {
  /** Interrogation périodique de l'API (au mieux toutes les 15 min). */
  polling: boolean;
  /** Service au premier plan qui garde la socket de l'API ouverte. */
  instant: boolean;
  /** Android autorise l'app à afficher des notifications. */
  canNotify: boolean;
  /** L'app est exclue de l'optimisation de batterie. */
  batteryExempt: boolean;
  /** Un jeton valide a été transmis à la partie native. */
  sessionReady: boolean;
}

interface INativeNotifications {
  setCredentials(apiUrl: string, accessToken: string, expiresAt: number): void;
  clearCredentials(): void;
  setPolling(enabled: boolean): void;
  setInstant(enabled: boolean): void;
  checkNow(): void;
  getStatus(): IPhoneNotificationsStatus;
  openBatterySettings(): void;
  openNotificationSettings(): void;
}

const native = requireNativeModule<INativeNotifications>('ActunimeNotifications');

/** Notifications du téléphone, sans service externe : interrogation périodique et, en option, service instantané. */
export const PhoneNotifications = {
  setCredentials: (apiUrl: string, accessToken: string, expiresAt: number) => native.setCredentials(apiUrl, accessToken, expiresAt),
  clearCredentials: () => native.clearCredentials(),
  setPolling: (enabled: boolean) => native.setPolling(enabled),
  setInstant: (enabled: boolean) => native.setInstant(enabled),
  checkNow: () => native.checkNow(),
  getStatus: () => native.getStatus(),
  openBatterySettings: () => native.openBatterySettings(),
  openNotificationSettings: () => native.openNotificationSettings(),
};
