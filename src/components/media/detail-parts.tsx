import { Image } from 'expo-image';
import { ExternalLink, Play, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Sheen } from '@/components/ui/sheen';
import { Pressable } from '@/components/tap';
import { CardImage } from '@/components/cards/media-cards';
import { Txt } from '@/components/tw';
import { Tw, alpha, Floating } from '@/constants/theme';
import type { INewsArticle, MediaKind } from '@/lib/api';
import { NEWS_TYPE_LABELS, newsCover } from '@/lib/media';

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
      <Sheen />
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
  SOON: { color: Tw.color.primary, background: alpha(Tw.color.primary, 0.15), border: alpha(Tw.color.primary, 0.3) },
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
  square = false,
}: Readonly<{ items: ICarouselItem[]; kind?: MediaKind; width?: number; placeholder?: LucideIcon; square?: boolean }>) {
  const imageStyle = [styles.carouselImage, square && styles.carouselSquare, { width }];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
      {items.map((item) => (
        <Pressable key={item.id} disabled={!item.onPress} onPress={item.onPress} style={({ pressed }) => [{ width }, pressed && { opacity: 0.85 }]}>
          <View>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={imageStyle} contentFit="cover" transition={150} />
            ) : (
              <CardImage kind={kind} icon={placeholder} style={imageStyle} />
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

/** Actualités d'une fiche (`NewsSection` du site) : visuel, type et date, titre, note, trailer et sources citées. */
export function NewsList({ articles, onOpen }: Readonly<{ articles: INewsArticle[]; onOpen: (url: string) => void }>) {
  return (
    <View style={styles.newsList}>
      {articles.map((article) => {
        const cover = newsCover(article);
        return (
          <View key={article.id ?? article._id ?? article.title} style={styles.newsRow}>
            {cover ? <Image source={{ uri: cover }} style={styles.newsCover} contentFit="cover" transition={150} /> : null}
            <View style={styles.newsBody}>
              <View style={styles.newsMeta}>
                <Pill label={NEWS_TYPE_LABELS[article.type] ?? article.type} {...PRIMARY_PILL} />
                {article.publishedAt ? (
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {new Date(article.publishedAt).toLocaleDateString('fr-FR')}
                  </Txt>
                ) : null}
              </View>
              <Txt size="sm" weight="medium">
                {article.title}
              </Txt>
              {article.summary ? (
                <Txt size="sm" color={Tw.color.mutedForeground}>
                  {article.summary}
                </Txt>
              ) : null}
              <View style={styles.newsLinks}>
                {article.trailerUrl ? (
                  <Pressable accessibilityRole="link" onPress={() => onOpen(article.trailerUrl!)} style={styles.newsLink}>
                    <Play size={12} color={Tw.color.primary} />
                    <Txt size="xs" color={Tw.color.primary}>
                      Trailer
                    </Txt>
                  </Pressable>
                ) : null}
                {(article.sources ?? []).map((source) => (
                  <Pressable key={source.url} accessibilityRole="link" onPress={() => onOpen(source.url)} style={styles.newsLink}>
                    <Txt size="xs" color={Tw.color.mutedForeground}>
                      {source.label}
                    </Txt>
                    <ExternalLink size={12} color={Tw.color.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  newsList: { gap: 16 },
  newsRow: { flexDirection: 'row', gap: 12 },
  newsCover: { width: 96, height: 96, borderRadius: Tw.radius.md },
  newsBody: { flex: 1, gap: 4 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  newsLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  newsLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
  center: { textAlign: 'center' },
  card: { ...Floating, overflow: 'hidden', paddingVertical: 16, gap: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardContent: { paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  infoDivider: { borderTopWidth: 1, borderColor: Tw.color.border },
  infoValue: { flex: 1, textAlign: 'right' },
  infoValueBox: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  carousel: { gap: 12 },
  carouselSquare: { aspectRatio: 1 },
  carouselImage: { aspectRatio: 3 / 4, borderTopLeftRadius: Tw.radius.lg, borderTopRightRadius: Tw.radius.lg },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: alpha(Tw.color.background, 0.7), paddingHorizontal: 8, paddingVertical: 4 },
  carouselBody: { padding: 8, gap: 4 },
});
