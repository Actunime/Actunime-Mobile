/**
 * Notes de version destinées aux membres, tirées des commits depuis la release précédente.
 *
 * Seuls `feat` (Nouveautés) et `fix`/`perf` (Corrections) intéressent un membre ; `chore`, `docs`, `refactor`,
 * `test`, `ci`, `build` et `style` sont écartés. Le message d'un commit `feat`/`fix` doit donc se lire seul, en
 * français, du point de vue du membre (« la photo du bouton central suit le profil à jour »).
 *
 * Usage : `node scripts/release-notes.mjs [dossier]` écrit `release-notes.md` (page GitHub) et `release-notes.txt`
 * (lu par l'app dans `latest.json`) dans le dossier (le courant par défaut).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SECTIONS = [
  { title: 'Nouveautés', types: ['feat'] },
  { title: 'Corrections', types: ['fix', 'perf'] },
];
const SUBJECT = /^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/;
const MAX_LENGTH = 180;
const NOTHING = 'Améliorations internes et petites corrections.';

const clean = (text) => {
  const sentence = text.trim().replace(/\s+/g, ' ');
  const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return capitalized.length > MAX_LENGTH ? `${capitalized.slice(0, MAX_LENGTH - 1).trimEnd()}…` : capitalized;
};

/** Entrées regroupées par section, dans l'ordre des commits fournis, sans doublon. */
export function groupSubjects(subjects) {
  const seen = new Set();
  return SECTIONS.map(({ title, types }) => {
    const items = [];
    for (const subject of subjects) {
      const match = SUBJECT.exec(subject.trim());
      if (!match || !types.includes(match[1])) continue;
      const item = clean(match[3]);
      if (seen.has(item)) continue;
      seen.add(item);
      items.push(item);
    }
    return { title, items };
  }).filter((section) => section.items.length > 0);
}

/**
 * `markdown` : tout, pour la page de la release. `text` : pour l'app, au plus `maxText` entrées (les plus
 * récentes d'abord), le reste résumé par une ligne.
 */
export function buildReleaseNotes(subjects, { maxText = 10 } = {}) {
  const sections = groupSubjects(subjects);
  if (sections.length === 0) return { markdown: NOTHING, text: NOTHING, count: 0 };
  const count = sections.reduce((sum, section) => sum + section.items.length, 0);

  const markdown = sections.map((s) => `### ${s.title}\n${s.items.map((item) => `- ${item}`).join('\n')}`).join('\n\n');

  let budget = maxText;
  const parts = [];
  for (const { title, items } of sections) {
    if (budget <= 0) break;
    const shown = items.slice(0, budget);
    budget -= shown.length;
    parts.push(`${title}\n${shown.map((item) => `• ${item}`).join('\n')}`);
  }
  const hidden = count - Math.min(count, maxText);
  const text = parts.join('\n\n') + (hidden > 0 ? `\n\n… et ${hidden} autre${hidden > 1 ? 's' : ''} changement${hidden > 1 ? 's' : ''}, détail sur la page de la version.` : '');
  return { markdown, text, count };
}

/** Sujets des commits depuis la dernière release (`v*`), ou les 20 derniers s'il n'y en a pas. */
function subjectsSinceLastRelease() {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  let range = ['-20'];
  try {
    range = [`${git('describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD')}..HEAD`];
  } catch {
    // aucune release encore : on retombe sur les derniers commits
  }
  return git('log', '--no-merges', '--format=%s', ...range).split('\n').filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? '.';
  const { markdown, text } = buildReleaseNotes(subjectsSinceLastRelease());
  writeFileSync(join(dir, 'release-notes.md'), `${markdown}\n`);
  writeFileSync(join(dir, 'release-notes.txt'), text);
  console.log(text);
}
