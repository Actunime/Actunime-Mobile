import { Image } from 'expo-image';
import { type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CardImage } from '@/components/cards/media-cards';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import type { MediaKind } from '@/lib/api';

/** Bloc de section de la fiche (`SectionCard` : `Card` `bg-card py-4`, en-tête `px-4` avec icône et compteur). */
export function SectionCard({
  title,
  icon: Icon,
  count,
  action,
  children,
  onLayout,
}: Readonly<{
  title: string;
  icon?: LucideIcon;
  count?: number;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
  onLayout?: (y: number) => void;
}>) {
  return (
    <View style={styles.card} onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          {Icon ? <Icon size={20} color={Tw.color.mutedForeground} /> : null}
          <Txt size="base" weight="medium" leading={1.375}>
            {title}
          </Txt>
          {count !== undefined ? (
            <Txt size="xs" color={Tw.color.mutedForeground}>
              ({count})
            </Txt>
          ) : null}
        </View>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
            <Txt size="sm" weight="medium" color={Tw.color.mutedForeground}>
              {action.label} →
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

/** Ligne d'informations (`InfoRow`) : libellé à gauche, valeur à droite, séparées par un filet. */
export function InfoRow({ label, value, first }: Readonly<{ label: string; value: React.ReactNode; first?: boolean }>) {
  return (
    <View style={[styles.infoRow, !first && styles.infoDivider]}>
      <Txt size="sm" weight="medium" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
      {typeof value === 'string' ? (
        <Txt size="sm" style={styles.infoValue}>
          {value}
        </Txt>
      ) : (
        <View style={styles.infoValueBox}>{value}</View>
      )}
    </View>
  );
}

/** Pastille arrondie de la fiche (`px-2.5 py-0.5 rounded-full text-xs font-medium border`). */
export function Pill({
  label,
  icon: Icon,
  color = Tw.color.foreground,
  background = alpha(Tw.color.muted, 0.5),
  border = Tw.color.border,
  iconColor,
  iconFill,
  onPress,
}: Readonly<{
  label: React.ReactNode;
  icon?: LucideIcon;
  color?: string;
  background?: string;
  border?: string;
  iconColor?: string;
  iconFill?: string;
  onPress?: () => void;
}>) {
  const Box = onPress ? Pressable : View;
  return (
    <Box onPress={onPress} style={[styles.pill, { backgroundColor: background, borderColor: border }]}>
      {Icon ? <Icon size={12} color={iconColor ?? color} fill={iconFill ?? 'transparent'} /> : null}
      {typeof label === 'string' ? (
        <Txt size="xs" weight="medium" color={color}>
          {label}
        </Txt>
      ) : (
        label
      )}
    </Box>
  );
}

/** Pastilles de genres, thèmes, démographies (`bg-primary/10 border-primary/30 text-primary`). */
export const PRIMARY_PILL = { color: Tw.color.primary, background: alpha(Tw.color.primary, 0.1), border: alpha(Tw.color.primary, 0.3) };

/** Couleurs de la pastille de diffusion de l'en-tête de fiche (`statusColor` de la route du site). */
export const STATUS_PILL: Record<string, { color: string; background: string; border: string }> = {
  AIRING: { color: Tw.color.green400, background: alpha(Tw.color.green500, 0.15), border: alpha(Tw.color.green500, 0.3) },
  ENDED: { color: Tw.color.gray400, background: alpha(Tw.color.gray500, 0.15), border: alpha(Tw.color.gray500, 0.3) },
  SOON: { color: Tw.color.blue400, background: alpha(Tw.color.blue500, 0.15), border: alpha(Tw.color.blue500, 0.3) },
  PAUSED: { color: Tw.color.yellow400, background: alpha(Tw.color.yellow500, 0.15), border: alpha(Tw.color.yellow500, 0.3) },
  STOPPED: { color: Tw.color.red400, background: alpha(Tw.color.red500, 0.15), border: alpha(Tw.color.red500, 0.3) },
  POSTONED: { color: Tw.color.orange400, background: alpha(Tw.color.orange500, 0.15), border: alpha(Tw.color.orange500, 0.3) },
  UNKNOWN: { color: Tw.color.gray400, background: alpha(Tw.color.gray500, 0.15), border: alpha(Tw.color.gray500, 0.3) },
};

export interface ICarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  /** Bandeau sur l'image (`bottomLabel` des cartes de relations : « Suite », « Saison 2 · Préquelle »). */
  overlay?: string;
  onPress?: () => void;
}

/**
 * Rangée défilante de cartes (`Carousel` + cartes `w-36` du site) : relations, personnages, staff, musiques.
 * Le défilement horizontal est celui du carrousel lui-même, pas de la page.
 */
export function CardCarousel({
  items,
  kind = 'anime',
  width = 144,
  placeholder,
}: Readonly<{ items: ICarouselItem[]; kind?: MediaKind; width?: number; placeholder?: LucideIcon }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
      {items.map((item) => (
        <Pressable key={item.id} disabled={!item.onPress} onPress={item.onPress} style={({ pressed }) => [{ width }, pressed && { opacity: 0.85 }]}>
          <View>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={[styles.carouselImage, { width }]} contentFit="cover" transition={150} />
            ) : (
              <CardImage kind={kind} icon={placeholder} style={[styles.carouselImage, { width }]} />
            )}
            {item.overlay ? (
              <View style={styles.overlay}>
                <Txt size="11" weight="medium" color="#fff" numberOfLines={1} style={styles.center}>
                  {item.overlay}
                </Txt>
              </View>
            ) : null}
          </View>
          <View style={styles.carouselBody}>
            <Txt size="sm" weight="semibold" numberOfLines={2}>
              {item.title}
            </Txt>
            {item.subtitle ? (
              <Txt size="xs" color={Tw.color.mutedForeground} numberOfLines={1}>
                {item.subtitle}
              </Txt>
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  card: { backgroundColor: Tw.color.card, borderRadius: 4, paddingVertical: 16, gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardContent: { paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  infoDivider: { borderTopWidth: 1, borderColor: Tw.color.border },
  infoValue: { flex: 1, textAlign: 'right' },
  infoValueBox: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  carousel: { gap: 12 },
  carouselImage: { aspectRatio: 3 / 4, borderTopLeftRadius: Tw.radius.lg, borderTopRightRadius: Tw.radius.lg },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: alpha(Tw.color.background, 0.7), paddingHorizontal: 8, paddingVertical: 4 },
  carouselBody: { padding: 8, gap: 4 },
});
