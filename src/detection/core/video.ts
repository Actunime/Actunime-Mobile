/**
 * Fin d'épisode : une vidéo de la page qui atteint la part de lecture réglée (90 % par défaut), ou qui se termine.
 * Seules les vidéos du document sont vues : un lecteur dans une iframe d'un autre site est hors de portée de
 * WebView sur Android (le script n'est injecté que dans la page principale) — pour ceux-là, « Marquer comme lu ».
 */
interface VideoObserverOptions {
  /** Part de la vidéo à atteindre (0-1), relue à chaque mesure : le réglage peut changer en cours de lecture. */
  threshold: () => number;
  onReached: () => void;
  /** Lecture entamée : la vidéo tourne depuis `START_SECONDS`. Une fois par observateur. */
  onStarted?: () => void;
}

export interface VideoObserver {
  cleanup: () => void;
}

/** En dessous, c'est une publicité, un aperçu ou un générique seul : pas un épisode. */
export const MIN_EPISODE_SECONDS = 150;
/** Position à partir de laquelle une vidéo en lecture compte comme « commencée » (pas un simple clic sur lecture). */
export const START_SECONDS = 30;

export function createVideoObserver(opts: VideoObserverOptions): VideoObserver {
  let fired = false;
  let started = false;
  const watched = new WeakSet<HTMLVideoElement>();
  const disposers: Array<() => void> = [];

  const fire = () => {
    if (fired) return;
    fired = true;
    opts.onReached();
  };

  const check = (video: HTMLVideoElement, ended = false) => {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration < MIN_EPISODE_SECONDS) return;
    if (!started && !video.paused && video.currentTime >= START_SECONDS) {
      started = true;
      opts.onStarted?.();
    }
    if (ended || video.currentTime / duration >= opts.threshold()) fire();
  };

  const watch = (video: HTMLVideoElement) => {
    if (watched.has(video)) return;
    watched.add(video);
    const onTime = () => check(video);
    const onEnded = () => check(video, true);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ended', onEnded);
    disposers.push(() => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('ended', onEnded);
    });
  };

  const scan = () => document.querySelectorAll('video').forEach(watch);
  scan();
  // Les lecteurs créent leur <video> après le chargement : on suit les ajouts au document.
  const mutations = new MutationObserver(scan);
  mutations.observe(document.documentElement, { childList: true, subtree: true });

  return {
    cleanup() {
      mutations.disconnect();
      disposers.forEach((dispose) => dispose());
    },
  };
}
