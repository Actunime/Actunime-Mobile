// Copié de Actunime-Sync (`src/content/wizard.ts`) : sélecteur CSS stable d'un élément pointé par l'utilisateur.

export function generateSelector(el: HTMLElement): string {
  // 1. ID — privilégié si stable et unique (pas auto-généré react-id)
  const id = el.id;
  if (id && /^[a-zA-Z][\w-]{0,40}$/.test(id) && document.querySelectorAll(`#${cssEscape(id)}`).length === 1) {
    return `#${cssEscape(id)}`;
  }

  // 2. Attributs testid (très stables côté front moderne)
  const testid = el.getAttribute('data-testid') ?? el.getAttribute('data-test-id') ?? el.getAttribute('data-test');
  if (testid) {
    const sel = `[data-testid="${cssEscape(testid)}"]`;
    if (document.querySelectorAll(sel).length === 1) return sel;
  }

  // 3. Classes stables (filtre les classes hashées genre css-3rg5xn)
  const classSel = buildClassSelector(el);
  if (classSel && document.querySelectorAll(classSel).length === 1) return classSel;

  // 4. Path montant avec nth-of-type
  return buildPathSelector(el);
}

function buildClassSelector(el: HTMLElement): string | null {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).filter(
    (c) => /^[a-zA-Z_-][\w-]{1,40}$/.test(c) && !/^css-[a-z0-9]{4,}$/.test(c) && !/^_/.test(c),
  );
  if (classes.length === 0) return null;
  return tag + '.' + classes.map(cssEscape).join('.');
}

function buildPathSelector(el: HTMLElement): string {
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.documentElement && parts.length < 6) {
    const node: HTMLElement = cur;
    const tag = node.tagName.toLowerCase();
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const siblings = Array.from(parent.children).filter((s): s is Element => s.tagName === node.tagName);
    if (siblings.length === 1) {
      parts.unshift(tag);
    } else {
      const idx = siblings.indexOf(node) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
    }
    // Si le parent a un ID stable on s'arrête là
    if (parent.id && /^[a-zA-Z][\w-]{0,40}$/.test(parent.id)) {
      parts.unshift(`#${cssEscape(parent.id)}`);
      return parts.join(' > ');
    }
    cur = parent;
  }
  return parts.join(' > ');
}

function cssEscape(s: string): string {
  return s.replace(/(["\\.#[\]:()\s])/g, '\\$1');
}
