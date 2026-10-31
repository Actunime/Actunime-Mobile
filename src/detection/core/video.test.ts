import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createVideoObserver, type VideoObserver } from './video';

function addVideo(duration: number, paused = false) {
  const video = document.createElement('video');
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
  Object.defineProperty(video, 'paused', { value: paused, configurable: true });
  Object.defineProperty(video, 'currentTime', { value: 0, writable: true, configurable: true });
  document.body.appendChild(video);
  return video;
}

describe('createVideoObserver', () => {
  let observer: VideoObserver;
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => observer?.cleanup());

  it('signale la fin à la part réglée, une seule fois', () => {
    const onReached = vi.fn();
    const video = addVideo(1400);
    observer = createVideoObserver({ threshold: () => 0.9, onReached });

    video.currentTime = 600;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onReached).not.toHaveBeenCalled();

    video.currentTime = 1300;
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('timeupdate'));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('relit le seuil à chaque mesure', () => {
    const onReached = vi.fn();
    let threshold = 0.95;
    const video = addVideo(1000);
    observer = createVideoObserver({ threshold: () => threshold, onReached });

    video.currentTime = 900;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onReached).not.toHaveBeenCalled();

    threshold = 0.8;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('signale aussi la fin de la vidéo', () => {
    const onReached = vi.fn();
    const video = addVideo(1400);
    observer = createVideoObserver({ threshold: () => 0.99, onReached });

    video.currentTime = 1000;
    video.dispatchEvent(new Event('ended'));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('ignore les vidéos trop courtes (publicités, aperçus)', () => {
    const onReached = vi.fn();
    const ad = addVideo(30);
    observer = createVideoObserver({ threshold: () => 0.9, onReached });

    ad.currentTime = 30;
    ad.dispatchEvent(new Event('timeupdate'));
    ad.dispatchEvent(new Event('ended'));
    expect(onReached).not.toHaveBeenCalled();
  });

  it('suit une vidéo ajoutée après coup', async () => {
    const onReached = vi.fn();
    observer = createVideoObserver({ threshold: () => 0.9, onReached });

    const video = addVideo(1400);
    await new Promise((resolve) => setTimeout(resolve, 0));
    video.currentTime = 1350;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onReached).toHaveBeenCalledTimes(1);
  });

  it('signale le début de lecture après 30 s en lecture, pas à l’ouverture ni en pause', () => {
    const onStarted = vi.fn();
    const video = addVideo(1400);
    observer = createVideoObserver({ threshold: () => 0.9, onReached: vi.fn(), onStarted });

    video.currentTime = 5;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onStarted).not.toHaveBeenCalled();

    video.currentTime = 40;
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('timeupdate'));
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it('ne signale pas le début d’une vidéo en pause', () => {
    const onStarted = vi.fn();
    const video = addVideo(1400, true);
    observer = createVideoObserver({ threshold: () => 0.9, onReached: vi.fn(), onStarted });

    video.currentTime = 600;
    video.dispatchEvent(new Event('timeupdate'));
    expect(onStarted).not.toHaveBeenCalled();
  });
});
