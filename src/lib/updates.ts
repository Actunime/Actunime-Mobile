/**
 * Mises à jour de l'app : lecture de la dernière release GitHub et de sa fiche de version (`latest.json`, jointe par
 * la CI avec `version`, `versionCode`, `sha256`, `apk`, `notes`). Logique pure : le téléchargement et l'installation
 * sont dans le module natif `actunime-updater`.
 */
export interface IReleaseInfo {
  version: string;
  versionCode: number;
  sha256: string;
  apkUrl: string;
  /** Page GitHub de la release : c'est là que le membre télécharge l'APK (l'app n'installe rien elle-même). */
  pageUrl: string;
  notes: string;
}

interface IGithubAsset {
  name?: unknown;
  browser_download_url?: unknown;
}

interface IGithubRelease {
  html_url?: unknown;
  draft?: unknown;
  assets?: unknown;
}

const MANIFEST_NAME = 'latest.json';
const RELEASES_PAGE = 'https://github.com/Actunime/Actunime-Mobile/releases';

/** Page de la release ; seule une adresse du dépôt de l'app est acceptée, sinon la liste des releases. */
const pageOf = (release: IGithubRelease): string =>
  typeof release.html_url === 'string' && release.html_url.startsWith(`${RELEASES_PAGE}/`) ? release.html_url : RELEASES_PAGE;
const SHA256 = /^[0-9a-f]{64}$/i;

/** Au plus une recherche par jour au lancement (le bouton « Rechercher une mise à jour » passe outre). */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const shouldCheck = (lastCheck: number | undefined, now: number, force = false): boolean =>
  force || lastCheck === undefined || now - lastCheck >= CHECK_INTERVAL_MS;

/** La release proposée est-elle plus récente que l'app installée ? `versionCode` seul fait foi (Android l'impose). */
export const isNewer = (candidateCode: number, installedCode: number): boolean => candidateCode > installedCode;

const assetsOf = (release: IGithubRelease): IGithubAsset[] => (Array.isArray(release.assets) ? (release.assets as IGithubAsset[]) : []);

/** URL du téléchargement d'un asset par son nom, ou `null`. */
function assetUrl(release: IGithubRelease, name: string): string | null {
  const asset = assetsOf(release).find((candidate) => candidate.name === name);
  return typeof asset?.browser_download_url === 'string' ? asset.browser_download_url : null;
}

/** Première release publiée (hors brouillon) qui porte une fiche de version : sa fiche et son APK. */
export function pickRelease(releases: unknown): { manifestUrl: string; release: IGithubRelease } | null {
  if (!Array.isArray(releases)) return null;
  for (const release of releases as IGithubRelease[]) {
    if (release.draft === true) continue;
    const manifestUrl = assetUrl(release, MANIFEST_NAME);
    if (manifestUrl) return { manifestUrl, release };
  }
  return null;
}

/** Fiche de version validée (champs et types) ; `null` si elle est incomplète ou suspecte. */
export function parseManifest(manifest: unknown, release: IGithubRelease): IReleaseInfo | null {
  if (typeof manifest !== 'object' || manifest === null) return null;
  const m = manifest as Record<string, unknown>;
  if (typeof m.version !== 'string' || typeof m.apk !== 'string' || typeof m.sha256 !== 'string') return null;
  if (typeof m.versionCode !== 'number' || !Number.isInteger(m.versionCode) || m.versionCode < 1) return null;
  if (!SHA256.test(m.sha256)) return null;
  const apkUrl = assetUrl(release, m.apk);
  if (!apkUrl) return null;
  return {
    version: m.version,
    versionCode: m.versionCode,
    sha256: m.sha256.toLowerCase(),
    apkUrl,
    pageUrl: pageOf(release),
    notes: typeof m.notes === 'string' ? m.notes : '',
  };
}

/** Lit la dernière release : la liste, puis sa fiche. `null` quand il n'y en a pas (ou qu'elle est illisible). */
export async function fetchLatestRelease(url: string, fetchImpl: typeof fetch = fetch): Promise<IReleaseInfo | null> {
  const listing = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!listing.ok) throw new Error(`Recherche de mise à jour impossible (${listing.status})`);
  const picked = pickRelease(await listing.json());
  if (!picked) return null;
  const manifestResponse = await fetchImpl(picked.manifestUrl);
  if (!manifestResponse.ok) throw new Error(`Fiche de version illisible (${manifestResponse.status})`);
  return parseManifest(await manifestResponse.json(), picked.release);
}
