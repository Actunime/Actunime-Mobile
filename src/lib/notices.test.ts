import { describe, expect, it } from 'vitest';

import { progressNotice } from './notices';

describe('progressNotice', () => {
  it('dit seulement quel chapitre ou épisode est enregistré', () => {
    expect(progressNotice('manga', 1, 'updated')).toBe('Chapitre 1 enregistré');
    expect(progressNotice('anime', 3, 'updated')).toBe('Épisode 3 enregistré');
    expect(progressNotice('manga', 12, 'created')).toBe('Chapitre 12 ajouté à ta liste');
    expect(progressNotice('anime', 3, 'unchanged')).toBe('Épisode 3 déjà enregistré');
  });
});
