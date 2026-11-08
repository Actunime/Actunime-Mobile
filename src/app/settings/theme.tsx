import { perkUnlockLabel, SupporterPerkObj, type IMemberAuraIntensity, type IMemberAuraStyle, type ISupporterPerk } from '@actunime/types';
import { APPEARANCE_PRESET_COLORS, THEME_PRESETS, type IMemberAppearanceBody } from '@actunime/validations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Lock, Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { AvatarAura } from '@/components/member/avatar-aura';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { PaletteProvider, ThemeBackdrop, useMyAppearance, usePalette } from '@/components/theme-context';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { resolveAura } from '@/lib/aura';
import { appearanceIssues, appearanceToSignature, applyPreset, backgroundFor, blockedReason, COLOR_FIELDS, isDraftDirty, normalizeHex, SITE_THEME_COLORS, setThemeColor, stepBlur, stepOverlay, type IColorKey } from '@/lib/appearance-edit';
import { pickImage } from '@/lib/image-picker';
import { billingApi } from '@/lib/billing';
import { paletteFromAppearance } from '@/lib/palette';
import { setThemeDraft, setThemePref, useThemeState } from '@/lib/theme-store';

const VEIL_COLORS = ['#000000', '#0b1020', '#1a0010', '#001a0e', '#ffffff'];

const AURA_STYLES: { value: IMemberAuraStyle; label: string }[] = [
  { value: 'tier', label: 'Palier' },
  { value: 'ember', label: 'Braise' },
  { value: 'aurora', label: 'Aurore' },
  { value: 'sakura', label: 'Sakura' },
  { value: 'stars', label: 'Étoiles' },
];
const INTENSITIES: { value: IMemberAuraIntensity; label: string }[] = [
  { value: 'soft', label: 'Discrète' },
  { value: 'normal', label: 'Normale' },
  { value: 'intense', label: 'Intense' },
];

/** Bloc de l'éditeur : titre, explication, et le cadenas de l'avantage qui l'enregistre quand il n'est pas débloqué. */
function Section({ title, hint, perk, unlocked = true, children }: Readonly<{ title: string; hint?: string; perk?: ISupporterPerk; unlocked?: boolean; children: React.ReactNode }>) {
  return (
    <SettingsCard>
      <View style={styles.sectionHead}>
        <Txt size="base" weight="semibold" style={styles.flex}>
          {title}
        </Txt>
        {perk && !unlocked ? (
          <View style={styles.lock}>
            <Lock size={12} color={Tw.color.mutedForeground} />
            <Txt size="xs" color={Tw.color.mutedForeground}>
              dès {perkUnlockLabel(perk)}
            </Txt>
          </View>
        ) : null}
      </View>
      {hint ? (
        <Txt size="xs" color={Tw.color.mutedForeground}>
          {hint}
        </Txt>
      ) : null}
      {children}
    </SettingsCard>
  );
}

function Choice<T extends string>({ value, options, onChange }: Readonly<{ value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }>) {
  const palette = usePalette();
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(option.value)} style={[styles.choice, !palette.isDefault && { backgroundColor: palette.input }, on && styles.choiceOn, on && !palette.isDefault && { backgroundColor: palette.primary }]}>
            <Txt size="sm" weight={on ? 'semibold' : 'normal'} color={on ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: Readonly<{ label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }>) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Txt size="sm" weight="medium">
          {label}
        </Txt>
        {hint ? (
          <Txt size="xs" color={Tw.color.mutedForeground}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Tw.color.primary, false: Tw.color.input }} thumbColor="#ffffff" />
    </View>
  );
}

/** Réglage numérique par pas : « − valeur + ». */
function Stepper({ label, value, onMinus, onPlus }: Readonly<{ label: string; value: string; onMinus: () => void; onPlus: () => void }>) {
  return (
    <View style={styles.toggle}>
      <Txt size="sm" weight="medium" style={styles.flex}>
        {label}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : moins`} onPress={onMinus} style={styles.step}>
        <Minus size={18} color={Tw.color.foreground} />
      </Pressable>
      <Txt size="sm" weight="semibold" tabular style={styles.stepValue}>
        {value}
      </Txt>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} : plus`} onPress={onPlus} style={styles.step}>
        <Plus size={18} color={Tw.color.foreground} />
      </Pressable>
    </View>
  );
}

/** Choix d'une couleur : palette de la charte, puis saisie hexadécimale (le contraste est vérifié à l'enregistrement). */
function ColorPicker({ label, value, onChange, error, swatches = true }: Readonly<{ label: string; value: string; onChange: (value: string) => void; error?: string; swatches?: boolean }>) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <View style={styles.colorField}>
      <View style={styles.colorHead}>
        <View style={[styles.dot, { backgroundColor: value }]} />
        <Txt size="sm" weight="medium" style={styles.flex}>
          {label}
        </Txt>
        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next);
            const hex = normalizeHex(next);
            if (hex) onChange(hex);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          accessibilityLabel={`${label}, code couleur`}
          style={styles.hex}
          placeholderTextColor={Tw.color.mutedForeground}
        />
      </View>
      {swatches ? (
        <View style={styles.swatches}>
          {APPEARANCE_PRESET_COLORS.map((color) => (
            <Pressable key={color} accessibilityRole="button" accessibilityLabel={color} onPress={() => onChange(color)} style={[styles.swatch, { backgroundColor: color }, color === value && styles.swatchOn]} />
          ))}
        </View>
      ) : null}
      {error ? (
        <Txt size="xs" color={Tw.color.destructive}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

/** Aperçu : une carte de membre et un texte, dans le thème du brouillon. */
function Preview({ draft, tier }: Readonly<{ draft: IMemberAppearanceBody; tier: number }>) {
  const palette = useMemo(() => paletteFromAppearance(draft, 'profile'), [draft]);
  const signature = useMemo(() => appearanceToSignature(draft), [draft]);
  const aura = resolveAura(signature, tier);
  const radius = draft.avatarShape === 'circle' ? 28 : Tw.radius.lg;
  return (
    <PaletteProvider palette={palette}>
      <View style={[styles.preview, { backgroundColor: palette.backgroundImage ? '#000' : palette.background }]}>
        <ThemeBackdrop palette={palette} />
        <View style={[styles.previewCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <AvatarAura size={56} radius={radius} aura={draft.aura?.profile === false ? null : aura}>
            <View style={{ width: 56, height: 56, borderRadius: radius, backgroundColor: palette.muted, borderWidth: 2, borderColor: draft.accentColor, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size="lg" weight="bold">
                A
              </Txt>
            </View>
          </AvatarAura>
          <View style={styles.flex}>
            <Txt size="base" weight="bold" color={draft.nameColor}>
              Ton pseudo
            </Txt>
            <Txt size="xs" color={Tw.color.mutedForeground}>
              Voilà comment les autres te voient.
            </Txt>
          </View>
        </View>
        <Button label="Un bouton" />
      </View>
    </PaletteProvider>
  );
}

/** Thème et signature (`settings/theme` du site) : couleurs, identité, photo et aura, police et effets. */
export default function ThemeSettings() {
  const palette = usePalette();
  const query = useMyAppearance();
  const client = useQueryClient();
  const { applyOwnTheme, showProfileThemes } = useThemeState();
  const [draft, setDraft] = useState<IMemberAppearanceBody | null>(null);
  const [livePreview, setLivePreview] = useState(true);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const data = query.data;

  useEffect(() => {
    if (data && !draft) setDraft(data.appearance);
  }, [data, draft]);

  const dirty = isDraftDirty(draft, data?.appearance);
  // Aperçu sur toute l'app : seulement quand il y a une différence avec ce qui est enregistré.
  useEffect(() => {
    setThemeDraft(livePreview && dirty ? draft : null);
  }, [draft, dirty, livePreview]);
  useEffect(() => () => setThemeDraft(null), []);

  const perks = data?.perks;
  // Cellules de couleur de l'image enregistrée : la lisibilité se mesure ici sans pouvoir lire l'image.
  const samples = draft?.background?.imageUrl && draft.background.imageUrl === data?.appearance.background?.imageUrl ? data?.backdropSamples : null;
  const issues = useMemo(() => (draft ? appearanceIssues(draft, perks, samples) : {}), [draft, perks, samples]);
  const save = useMutation({
    mutationFn: (value: IMemberAppearanceBody) => billingApi.saveAppearance(value),
    onSuccess: (saved) => {
      client.setQueryData(['my-appearance'], saved);
      setDraft(saved.appearance);
      void client.invalidateQueries({ queryKey: ['member'] });
    },
  });

  if (query.isPending || (data && !draft)) {
    return (
      <SettingsPage title="Thème & signature">
        <Loading />
      </SettingsPage>
    );
  }
  if (query.isError || !data || !draft) {
    return (
      <SettingsPage title="Thème & signature">
        <ErrorState error={query.error ?? new Error('Thème indisponible')} onRetry={() => void query.refetch()} />
      </SettingsPage>
    );
  }

  const reason = blockedReason(draft, perks, data.isSupporter);
  const valid = Object.keys(issues).length === 0;
  const update = <K extends keyof IMemberAppearanceBody>(key: K, value: IMemberAppearanceBody[K]) => setDraft({ ...draft, [key]: value });
  // Image de fond : envoyée sur Actunime avec l'avantage thème, sinon simple essai sur le téléphone (jamais envoyé).
  const chooseBackground = async () => {
    setBgError(null);
    setBgBusy(true);
    try {
      const file = await pickImage('BACKGROUND');
      if (!file) return;
      const url = perks?.themeAdvanced ? (await billingApi.uploadBackground(file)).url : file;
      setDraft({ ...draft, background: backgroundFor(url, draft.background) });
    } catch (error) {
      setBgError(errorMessage(error));
    } finally {
      setBgBusy(false);
    }
  };
  const aura = draft.aura ?? { source: 'theme' as const, profile: true };
  const setAura = (patch: Partial<NonNullable<IMemberAppearanceBody['aura']>>) => update('aura', { ...aura, ...patch });
  const setEffect = (patch: Partial<IMemberAppearanceBody['effects']>) => update('effects', { ...draft.effects, ...patch });

  return (
    <SettingsPage title="Thème & signature" description="Ton pseudo, tes couleurs et ton aura, pour toi dans toute l’app et pour ceux qui visitent ton profil. Ce qui se débloque en contribuant s’essaie ici avant d’être enregistré.">
      <Preview draft={draft} tier={data.tier} />

      <SettingsCard>
        <Toggle label="Appliquer mon thème à toute l’app" hint="Désactivé, tu gardes les couleurs d’Actunime partout ; ton thème reste visible sur ton profil." value={applyOwnTheme} onChange={(value) => setThemePref({ applyOwnTheme: value })} />
        <Toggle label="Voir les thèmes des profils" hint="Désactivé, les profils des autres s’affichent aux couleurs d’Actunime." value={showProfileThemes} onChange={(value) => setThemePref({ showProfileThemes: value })} />
        <Toggle label="Aperçu en direct" hint="Tes changements non enregistrés s’appliquent à toute l’app pour voir le vrai rendu." value={livePreview} onChange={setLivePreview} />
      </SettingsCard>

      <Section title="Thème de départ" hint="Un appui applique un thème complet, que tu peux ensuite ajuster." perk="signature" unlocked={!!perks?.signature}>
        <View style={styles.choices}>
          {THEME_PRESETS.map((preset) => (
            <Pressable key={preset.id} accessibilityRole="button" onPress={() => setDraft(applyPreset(draft, preset))} style={[styles.presetChip, !palette.isDefault && { backgroundColor: palette.input }]}>
              <View style={[styles.dot, { backgroundColor: preset.colors?.background ?? SITE_THEME_COLORS.background, borderWidth: 3, borderColor: preset.accentColor }]} />
              <Txt size="sm">{preset.label}</Txt>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Ton identité" hint="Visible partout où tu apparais : activités, amis, cartes de membre, et base de l’aura de palier." perk="signature" unlocked={!!perks?.signature}>
        <ColorPicker label="Couleur du pseudo" value={draft.nameColor} onChange={(value) => update('nameColor', value)} error={issues.nameColor} />
        <ColorPicker label="Couleur d’accent" value={draft.accentColor} onChange={(value) => update('accentColor', value)} error={issues.accentColor} />
      </Section>

      <Section title="Couleurs de l’app" hint="Chaque couleur pour toi, et de ton profil pour ses visiteurs." perk="theme" unlocked={!!perks?.theme}>
        {draft.colors ? (
          <>
            {COLOR_FIELDS.map((field) => (
              <ColorPicker key={field.key} label={field.label} value={(draft.colors?.[field.key as IColorKey] ?? '#000000').slice(0, 7)} onChange={(value) => setDraft(setThemeColor(draft, field.key, value))} error={issues[`colors.${field.key}`]} swatches={field.key === 'primary'} />
            ))}
            <Button label="Revenir aux couleurs d’Actunime" variant="outline" onPress={() => update('colors', null)} />
          </>
        ) : (
          <Button label="Personnaliser les couleurs" variant="outline" onPress={() => update('colors', SITE_THEME_COLORS)} />
        )}
      </Section>

      <Section title="Photo de profil" hint="Forme de la photo, aura de ton palier de contribution (dès Pilier) et, avec l’offre Soutien, auras à choisir." perk="theme" unlocked={!!perks?.theme}>
        <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
          Forme
        </Txt>
        <Choice value={draft.avatarShape ?? 'rounded'} options={[{ value: 'rounded', label: 'Arrondie' }, { value: 'circle', label: 'Ronde' }]} onChange={(value) => update('avatarShape', value)} />
        <Toggle label="Aura sur mon profil" value={aura.profile} onChange={(value) => setAura({ profile: value })} />
        <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
          Couleur de l’aura de palier
        </Txt>
        <Choice value={aura.source} options={[{ value: 'theme', label: 'Mon accent' }, { value: 'tier', label: 'Celle du palier' }]} onChange={(value) => setAura({ source: value })} />
        <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
          Style d’aura (Soutien)
        </Txt>
        <Choice value={aura.style ?? 'tier'} options={AURA_STYLES} onChange={(value) => setAura({ style: value === 'tier' ? undefined : value })} />
        <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
          Intensité (Soutien)
        </Txt>
        <Choice value={aura.intensity ?? 'normal'} options={INTENSITIES} onChange={(value) => setAura({ intensity: value === 'normal' ? undefined : value })} />
        <ColorPicker label="Couleur libre de l’aura (Soutien)" value={aura.color ?? draft.accentColor} onChange={(value) => setAura({ color: value })} error={issues['aura.color']} />
        {aura.color ? <Button label="Retirer la couleur libre" variant="outline" onPress={() => setAura({ color: undefined })} /> : null}
      </Section>

      <Section title="Police et effets" hint="Les effets animés sont coupés pour ceux qui réduisent les animations." perk="theme" unlocked={!!perks?.theme}>
        <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
          Police
        </Txt>
        <Choice value={draft.fontFamily} options={[{ value: 'sans', label: 'Outfit' }, { value: 'serif', label: 'Empattements' }, { value: 'mono', label: 'Machine' }]} onChange={(value) => update('fontFamily', value)} />
        <Toggle label="Lueur autour des cartes" value={draft.effects.cardGlow} onChange={(value) => setEffect({ cardGlow: value })} />
        <Toggle label="Cartes transparentes" hint={`Avantage « ${SupporterPerkObj.themeAdvanced.label} »`} value={draft.effects.transparentCards} onChange={(value) => setEffect({ transparentCards: value })} />
        <Toggle label="Apparition en fondu" value={draft.effects.entryTransition} onChange={(value) => setEffect({ entryTransition: value })} />
      </Section>

      <Section title="Image de fond" hint={`Derrière toute l’app, avec un voile pour garder le texte lisible. WebP, PNG ou JPEG, 10 Mo maximum.${perks?.themeAdvanced ? '' : ' Essai local : l’image reste sur ton téléphone et n’est pas envoyée.'}`} perk="themeAdvanced" unlocked={!!perks?.themeAdvanced}>
        {draft.background ? <Image source={{ uri: draft.background.imageUrl }} style={styles.bgPreview} contentFit="cover" blurRadius={draft.background.blur} /> : null}
        <Button label={bgBusy ? 'Envoi…' : draft.background ? 'Changer l’image' : 'Choisir une image'} variant="outline" disabled={bgBusy} onPress={() => void chooseBackground()} />
        {bgError ? <StatusNote tone="error">{bgError}</StatusNote> : null}
        {draft.background ? (
          <>
            <Stepper label="Flou" value={`${draft.background.blur} px`} onMinus={() => update('background', { ...draft.background!, blur: stepBlur(draft.background!.blur, -1) })} onPlus={() => update('background', { ...draft.background!, blur: stepBlur(draft.background!.blur, 1) })} />
            <Stepper label="Opacité du voile" value={`${Math.round(draft.background.overlay * 100)} %`} onMinus={() => update('background', { ...draft.background!, overlay: stepOverlay(draft.background!.overlay, -1) })} onPlus={() => update('background', { ...draft.background!, overlay: stepOverlay(draft.background!.overlay, 1) })} />
            <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
              Couleur du voile
            </Txt>
            <View style={styles.swatches}>
              {VEIL_COLORS.map((color) => (
                <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Voile ${color}`} onPress={() => update('background', { ...draft.background!, overlayColor: color })} style={[styles.swatch, { backgroundColor: color }, (draft.background!.overlayColor ?? '#000000') === color && styles.swatchOn]} />
              ))}
            </View>
            <Toggle label="Image fixe" hint="Elle ne défile pas avec la page." value={draft.background.fixed} onChange={(value) => update('background', { ...draft.background!, fixed: value })} />
            <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
              Où l’afficher
            </Txt>
            <Choice value={draft.background.scope} options={[{ value: 'profile', label: 'Mon profil' }, { value: 'page', label: 'Toute l’app' }]} onChange={(value) => update('background', { ...draft.background!, scope: value })} />
            <Button label="Retirer l’image de fond" variant="outline" onPress={() => update('background', null)} />
          </>
        ) : null}
        {issues.background ? <StatusNote tone="error">{issues.background}</StatusNote> : null}
      </Section>

      {!valid ? <StatusNote tone="error">Corrige les couleurs signalées pour enregistrer.</StatusNote> : null}
      {valid && reason ? <StatusNote tone="info">{reason}</StatusNote> : null}
      {save.isError ? <StatusNote tone="error">{errorMessage(save.error)}</StatusNote> : null}
      {save.isSuccess && !dirty ? <StatusNote tone="success">Thème enregistré.</StatusNote> : null}
      <Button label={save.isPending ? 'Enregistrement…' : 'Enregistrer'} disabled={!!reason || !valid || save.isPending || !dirty} onPress={() => save.mutate(draft)} />
      <Button label="Annuler les changements" variant="outline" disabled={!dirty || save.isPending} onPress={() => setDraft(data.appearance)} />
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 40, paddingHorizontal: 14, borderRadius: Tw.radius.full, backgroundColor: Tw.color.input, justifyContent: 'center' },
  choiceOn: { backgroundColor: Tw.color.primary },
  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: Tw.radius.full, backgroundColor: Tw.color.input },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  colorField: { gap: 8 },
  colorHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  hex: { minWidth: 92, minHeight: 40, paddingHorizontal: 10, borderRadius: Tw.radius.md, backgroundColor: Tw.color.input, color: Tw.color.foreground, fontFamily: 'monospace', fontSize: 14 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#ffffff' },
  bgPreview: { width: '100%', aspectRatio: 2.5, borderRadius: Tw.radius.lg },
  step: { width: 40, height: 40, borderRadius: 20, backgroundColor: Tw.color.input, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 56, textAlign: 'center' },
  preview: { borderRadius: Tw.radius.xl, padding: 16, gap: 12, overflow: 'hidden' },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, paddingLeft: 24, borderRadius: Tw.radius.xl, borderWidth: 1 },
});
