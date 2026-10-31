import { Alert } from 'react-native';

/**
 * Une fonction du site qui n'existe pas encore dans l'app est désactivée, jamais renvoyée vers le site : un appui
 * dit simplement qu'elle arrive bientôt.
 */
export function showSoon(feature = 'Cette fonction'): void {
  Alert.alert('Bientôt disponible', `${feature} arrive prochainement dans l’application.`);
}

/** Opacité d'un élément désactivé parce que « bientôt disponible ». */
export const SOON_OPACITY = 0.45;
