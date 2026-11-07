import { CharacterGenderObj, CharacterRoleObj, CompanyTypeObj, TrackTypeObj } from '@actunime/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Building2, Music, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Field, NumberField } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type IEntity, type MediaKind } from '@/lib/api';
import { entityBadge, entityImage, entityName } from '@/lib/entity';
import { mediaTitle } from '@/lib/media';
import { buildRelationAdd, buildRelationCreate, type RelationKind } from '@/lib/propose';

const CONFIG: Record<RelationKind, { entity: 'track' | 'company' | 'character' | 'person'; title: string; hint: string; empty: string; icon: typeof Music; create: string; nameLabel: string }> = {
  tracks: { entity: 'track', title: 'Ajouter une musique', hint: 'Rechercher une musique', empty: 'Aucune musique trouvée.', icon: Music, create: 'Elle n’est pas dans la liste ? La créer', nameLabel: 'Titre de la musique' },
  staffs: { entity: 'person', title: 'Ajouter un membre du staff', hint: 'Rechercher une personne', empty: 'Aucune personne trouvée.', icon: User, create: 'Elle n’est pas dans la liste ? La créer', nameLabel: 'Nom de la personne' },
  characters: { entity: 'character', title: 'Ajouter un personnage', hint: 'Rechercher un personnage', empty: 'Aucun personnage trouvé.', icon: User, create: 'Il n’est pas dans la liste ? Le créer', nameLabel: 'Nom du personnage' },
  companies: { entity: 'company', title: 'Ajouter une société', hint: 'Rechercher un studio, un éditeur…', empty: 'Aucune société trouvée.', icon: Building2, create: 'Elle n’est pas dans la liste ? La créer', nameLabel: 'Nom de la société' },
};

/** Types proposés à la création : seul strict minimum demandé, le reste de la fiche sera complété plus tard. */
const TYPE_OPTIONS: Record<RelationKind, { value: string; label: string }[]> = {
  tracks: Object.values(TrackTypeObj).map((type) => ({ value: type.value, label: type.label })),
  companies: Object.entries(CompanyTypeObj).map(([value, label]) => ({ value, label })),
  characters: [],
  staffs: [],
};

/** Rôle dans l'œuvre (obligatoire) et genre (facultatif) d'un personnage. */
const ROLE_OPTIONS = Object.entries(CharacterRoleObj).map(([value, role]) => ({ value, label: role.label }));
const GENDER_OPTIONS = Object.entries(CharacterGenderObj).map(([value, gender]) => ({ value, label: gender.label }));

/**
 * Compléter une fiche (petit parcours, à la place du formulaire complet du site) : chercher une musique ou une société
 * qui existe déjà et proposer de la rattacher à l'œuvre. La modération vérifie avant que ce soit appliqué.
 */
export default function CompleteScreen() {
  const { kind: rawKind, id, what: rawWhat } = useLocalSearchParams<{ kind: string; id: string; what: string }>();
  const kind: MediaKind = rawKind === 'manga' ? 'manga' : 'anime';
  const what: RelationKind = rawWhat === 'companies' ? 'companies' : rawWhat === 'characters' ? 'characters' : rawWhat === 'staffs' ? 'staffs' : 'tracks';
  const config = CONFIG[what];
  const Icon = config.icon;

  const media = useQuery({ queryKey: ['media', kind, id], queryFn: () => api.getMedia(kind, id), enabled: !!id });
  const linked = useQuery({
    queryKey: ['media-links', kind, id, what, 'all'],
    queryFn: () => api.getMediaLinks(kind, id, what, 100),
    enabled: !!id,
  });
  const linkedIds = new Set((linked.data?.results ?? []).map((link) => link.data?.id).filter(Boolean));

  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useQuery({
    queryKey: ['complete-search', config.entity, search],
    queryFn: () => api.searchEntities(config.entity, search),
    enabled: search.length >= 2,
  });

  const [picked, setPicked] = useState<IEntity | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [job, setJob] = useState<number | null>(null);
  const [start, setStart] = useState<number | undefined>(undefined);
  const [end, setEnd] = useState<number | undefined>(undefined);
  const withEpisodes = what === 'tracks' && kind === 'anime';
  const isCharacter = what === 'characters';
  // Le rôle est obligatoire pour un personnage (il décrit sa place dans l'œuvre) ; le type pour une musique ou une société.
  const isStaff = what === 'staffs';
  const canCreate = name.trim().length > 0 && (isCharacter ? !!role : isStaff ? job !== null : !!type);
  const canAddPicked = isStaff ? job !== null : !isCharacter || !!role;
  const send = useMutation({
    mutationFn: () =>
      api.proposeRelationAdd(
        kind,
        id,
        creating
          ? buildRelationCreate(what, { name, type: type ?? undefined, role: role ?? undefined, gender: gender ?? undefined, job: job ?? undefined, startEpisode: start, endEpisode: end })
          : buildRelationAdd(what, { id: picked!.id, startEpisode: start, endEpisode: end, role: role ?? undefined, job: job ?? undefined }),
      ),
  });

  return (
    <SettingsPage title={config.title} description={media.data ? mediaTitle(media.data) : undefined}>
      {send.isSuccess ? (
        <SettingsCard>
          <StatusNote tone="success">Proposition envoyée. La modération la vérifie ; tu peux suivre son avancement dans « Propositions ».</StatusNote>
        </SettingsCard>
      ) : picked ? (
        <SettingsCard>
          <View style={styles.row}>
            <Thumb image={entityImage(picked)} Icon={Icon} />
            <View style={styles.flex}>
              <Txt size="sm" weight="semibold">
                {entityName(picked)}
              </Txt>
              {entityBadge(config.entity, picked) ? (
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {entityBadge(config.entity, picked)}
                </Txt>
              ) : null}
            </View>
          </View>
          {isCharacter ? <Chips label="Rôle dans l’œuvre" options={ROLE_OPTIONS} value={role} onChange={setRole} /> : null}
          {isStaff ? <JobPicker value={job} onChange={setJob} /> : null}
          {withEpisodes ? <EpisodeFields start={start} end={end} onStart={setStart} onEnd={setEnd} /> : null}
          {send.isError ? <StatusNote tone="error">{errorMessage(send.error)}</StatusNote> : null}
          <Button label={send.isPending ? 'Envoi…' : 'Proposer l’ajout'} disabled={!canAddPicked || send.isPending} onPress={() => send.mutate()} />
          <Button label="Choisir autre chose" variant="outline" disabled={send.isPending} onPress={() => setPicked(null)} />
        </SettingsCard>
      ) : creating ? (
        <SettingsCard>
          <Field label={config.nameLabel}>
            <TextInput value={name} onChangeText={setName} maxLength={200} style={styles.input} placeholderTextColor={Colors.textSecondary} />
          </Field>
          {isCharacter ? (
            <>
              <Chips label="Rôle dans l’œuvre" options={ROLE_OPTIONS} value={role} onChange={setRole} />
              <Chips label="Genre (facultatif)" options={GENDER_OPTIONS} value={gender} onChange={(value) => setGender(gender === value ? null : value)} />
            </>
          ) : isStaff ? (
            <JobPicker value={job} onChange={setJob} />
          ) : (
            <Chips label="Type" options={TYPE_OPTIONS[what]} value={type} onChange={setType} />
          )}
          {withEpisodes ? <EpisodeFields start={start} end={end} onStart={setStart} onEnd={setEnd} /> : null}
          <Txt size="xs" color={Tw.color.mutedForeground}>
            Le reste (image, liens, artistes ou doubleurs…) pourra être complété ensuite, depuis sa propre page. La modération vérifie avant d’appliquer.
          </Txt>
          {send.isError ? <StatusNote tone="error">{errorMessage(send.error)}</StatusNote> : null}
          <Button label={send.isPending ? 'Envoi…' : 'Proposer la création et l’ajout'} disabled={!canCreate || send.isPending} onPress={() => send.mutate()} />
          <Button label="Revenir à la recherche" variant="outline" disabled={send.isPending} onPress={() => setCreating(false)} />
        </SettingsCard>
      ) : (
        <>
          <TextInput value={text} onChangeText={setText} placeholder={config.hint} placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
          <Pressable accessibilityRole="button" onPress={() => { setName(text.trim()); setCreating(true); }} style={styles.createLink}>
            <Txt size="sm" weight="medium" color={Tw.color.primary}>
              {config.create}
            </Txt>
          </Pressable>
          {search.length < 2 ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Tape au moins deux lettres pour chercher.
            </Txt>
          ) : results.isPending ? (
            <Loading />
          ) : results.isError ? (
            <ErrorState error={results.error} onRetry={() => void results.refetch()} />
          ) : results.data.results.length === 0 ? (
            <EmptyState title={config.empty} hint="Vérifie l’orthographe ou essaie un autre nom." />
          ) : (
            <View style={styles.list}>
              {results.data.results.map((entity) => {
                const already = linkedIds.has(entity.id);
                return (
                  <Pressable key={entity.id} accessibilityRole="button" disabled={already} onPress={() => setPicked(entity)} style={[styles.row, styles.item, already && styles.dim]}>
                    <Thumb image={entityImage(entity)} Icon={Icon} />
                    <View style={styles.flex}>
                      <Txt size="sm" weight="semibold" numberOfLines={2}>
                        {entityName(entity)}
                      </Txt>
                      <Txt size="xs" color={Tw.color.mutedForeground}>
                        {already ? 'Déjà sur la fiche' : (entityBadge(config.entity, entity) ?? ' ')}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </SettingsPage>
  );
}

/** Poste du staff (obligatoire) : liste officielle des postes (métadonnées `JOB`), filtrable par un mot. */
function JobPicker({ value, onChange }: Readonly<{ value: number | null; onChange: (value: number) => void }>) {
  const [filter, setFilter] = useState('');
  const jobs = useQuery({ queryKey: ['metadata', 'JOB'], queryFn: () => api.searchMetadata('JOB'), staleTime: 30 * 60_000 });
  const shown = (jobs.data ?? []).filter((job) => job.name.toLowerCase().includes(filter.trim().toLowerCase())).slice(0, 14);
  return (
    <Field label="Poste" hint={value === null ? 'obligatoire' : undefined}>
      <TextInput value={filter} onChangeText={setFilter} placeholder="Filtrer les postes…" placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
      {jobs.isPending ? (
        <Loading />
      ) : (
        <View style={styles.chips}>
          {shown.map((job) => (
            <Pressable key={job.id} accessibilityRole="button" accessibilityState={{ selected: value === job.id }} onPress={() => onChange(job.id)} style={[styles.chip, value === job.id && styles.chipOn]}>
              <Txt size="sm" weight="medium" color={value === job.id ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
                {job.name}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
    </Field>
  );
}

function Chips({ label, options, value, onChange }: Readonly<{ label: string; options: { value: string; label: string }[]; value: string | null; onChange: (value: string) => void }>) {
  return (
    <Field label={label}>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[styles.chip, selected && styles.chipOn]}>
              <Txt size="sm" weight="medium" color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
                {option.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}

function EpisodeFields({ start, end, onStart, onEnd }: Readonly<{ start?: number; end?: number; onStart: (v: number | undefined) => void; onEnd: (v: number | undefined) => void }>) {
  return (
    <>
      <Field label="À partir de l’épisode" hint="facultatif">
        <NumberField value={start} onChange={onStart} />
      </Field>
      <Field label="Jusqu’à l’épisode" hint="facultatif">
        <NumberField value={end} onChange={onEnd} />
      </Field>
    </>
  );
}

function Thumb({ image, Icon }: Readonly<{ image: string | null; Icon: typeof Music }>) {
  return (
    <View style={styles.thumb}>
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon size={20} color={Tw.color.mutedForeground} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  input: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { minHeight: 60, padding: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  dim: { opacity: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  chipOn: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  createLink: { minHeight: 44, justifyContent: 'center' },
  thumb: { width: 44, height: 44, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
});
