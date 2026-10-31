import { router, type Href } from 'expo-router';

/** Profil public d'un membre : un écran de l'app, jamais le site. */
export function openMember(username: string): void {
  router.push(`/member/${encodeURIComponent(username)}` as Href);
}
