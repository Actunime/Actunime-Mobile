import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Keyboard, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { setReadingChromeHidden, useReadingChromeHidden } from '@/lib/reading-chrome';
import { Colors, Fonts, alpha } from '@/constants/theme';
import { signOut, useAuth } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';

import { AvatarAura } from '@/components/member/avatar-aura';
import { usePalette, useThemeEpoch } from '@/components/theme-context';
import { api } from '@/lib/api';
import { useUnreadNotifications } from '@/lib/queries';
import { compactAura, resolveAura, tierOfBadges } from '@/lib/aura';
import { signatureRing } from '@/lib/signature';
import { SOON_OPACITY, showSoon } from '@/lib/soon';
import { isSearchType, type SearchType } from '@/lib/search-types';
import { LogoIcon } from './logo-icon';
import { SearchTypeSheet } from './search-type-sheet';
import { MEMBER_FAN, MEMBER_TABS, findActiveTabId, isSoonEntry, type IMobileNavItem } from './mobile-nav.config';
import {
  ACT_SIZE,
  computeFanSlots,
  pickSlot,
  placeLabels,
  type FanRing,
  type IFanSlot,
  type ILabelSize,
} from './radial-layout';

/** Durée d'appui avant que le bouton central s'ouvre en mode « glisser » (réglage du site). */
const HOLD_MS = 260;
/** Attente sur une action à sous-menu, doigt posé, avant d'ouvrir son sous-éventail (réglage du PO). */
const DWELL_MS = 1000;
/** Déplacement à partir duquel un doigt posé est considéré comme glissé. */
const SLIDE_PX = 14;
const FAB_SIZE = 68;
/** Hauteur de la barre hors zone sûre (`--mobile-nav-height` du site). */
const BAR_HEIGHT = 68;
/** Distance du centre du bouton central au bas de la barre, hors zone sûre : 8 de marge + 2 + demi-bouton. */
const HUB_FROM_BOTTOM = 8 + 2 + FAB_SIZE / 2;

/** Retour haptique là où le site vibre (`vibrate(6/8/10/14/18)`). */
const haptic = {
  aim: () => void Haptics.selectionAsync().catch(() => {}),
  open: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  back: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  push: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  choose: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
};

/** Ouvre la cible d'une entrée : écran natif, ou déconnexion. Une page du site pas encore reprise dans l'app dit « bientôt ». */
export function openTarget(target: IMobileNavItem): void {
  if (target.action === 'logout') void signOut();
  else if (target.native) router.navigate(target.native as Href);
  else if (target.path) showSoon(target.label);
}

/** Logo Actunime au centre du bouton central : centré dans un cadre de taille fixe (et non étiré à la hauteur du cercle). */
function HubLogo() {
  return (
    <View style={styles.fabLogoWrap}>
      <Image source={require('../../../assets/images/logo.png')} style={styles.fabLogo} contentFit="contain" />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DwellRing() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: DWELL_MS, easing: Easing.linear, useNativeDriver: false }).start();
  }, [progress]);
  const radius = (ACT_SIZE + 14) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const size = ACT_SIZE + 14;
  return (
    <Svg width={size} height={size} style={styles.dwell} pointerEvents="none">
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={Colors.primary}
        strokeWidth={3}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

/** Pastille de comptage (notifications non lues) posée sur un coin ; « 9+ » au-delà de 9. */
function CountBadge({ count, style }: Readonly<{ count: number; style?: object }>) {
  if (count <= 0) return null;
  return (
    <View pointerEvents="none" accessibilityLabel={`${count} non lue${count > 1 ? 's' : ''}`} style={[styles.count, style]}>
      <Text style={styles.countText}>{count > 9 ? '9+' : String(count)}</Text>
    </View>
  );
}

interface IFanActProps {
  /** Nombre à afficher en pastille sur l'action (notifications non lues). */
  badge?: number;
  entry: IMobileNavItem;
  slot: IFanSlot;
  index: number;
  hot: boolean;
  hubX: number;
  hubY: number;
  onPress: () => void;
}

/** Une action de l'éventail : sort du centre du bouton avec un léger décalage entre voisines (`mobile-nav-pop`). */
function FanAct({ entry, badge = 0, slot, index, hot, hubX, hubY, onPress }: Readonly<IFanActProps>) {
  const palette = usePalette();
  const themed = !palette.isDefault;
  // page du site pas encore reprise dans l'app : grisée, un appui dit « bientôt »
  const soon = isSoonEntry(entry);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(t, { toValue: 1, delay: index * 22, friction: 6, tension: 140, useNativeDriver: true }).start();
  }, [t, index]);
  return (
    <Animated.View
      style={[
        styles.actWrap,
        {
          left: hubX - ACT_SIZE / 2,
          top: hubY - ACT_SIZE / 2,
          opacity: t,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, slot.x] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, slot.y] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="menuitem"
        accessibilityLabel={entry.children ? `${entry.label} (sous-menu)` : entry.label}
        onPress={onPress}
        style={[
          styles.act,
          themed && { backgroundColor: palette.muted },
          !soon && styles.actAccent,
          !soon && themed && { borderColor: palette.primary },
          hot && styles.actHot,
          hot && themed && { backgroundColor: palette.primary },
          hot && { transform: [{ scale: 1.22 }] },
          soon && { opacity: SOON_OPACITY },
        ]}
      >
        <LogoIcon name={entry.icon} size={28} hot={hot} />
        {entry.children && !soon ? (
          <View style={styles.more}>
            <Ionicons name="chevron-forward" size={11} color="#fff" />
          </View>
        ) : null}
      </Pressable>
      <CountBadge count={badge} style={styles.countOnAct} />
      {hot && entry.children ? <DwellRing /> : null}
    </Animated.View>
  );
}

/**
 * Navigation du bas : barre à 5 emplacements dont le bouton central (photo de profil du membre) ouvre un éventail
 * radial. Appui long puis glisser et relâcher sur une action, ou tap pour ouvrir et re-tap pour choisir ; une
 * pause d'une seconde sur une action à sous-menu ouvre son sous-éventail. Port de `MobileNav` du site (E114) ;
 * la géométrie vient de `radial-layout.ts`, copiée telle quelle.
 */
/** La navigation se redessine quand le thème change : ses couleurs de la charte écrites en dur reprennent le nouveau thème. */
export function MobileNav() {
  return <MobileNavContent key={useThemeEpoch()} />;
}

function MobileNavContent() {
  const palette = usePalette();
  const { auth } = useAuth();
  // Ma signature (liseré, aura de palier ou de Soutien) habille aussi le bouton central, comme mon avatar partout ailleurs.
  const me = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile(), enabled: !!auth, staleTime: 60_000, retry: false });
  // La photo vient du profil à jour (invalidé après un changement), pas de la copie figée dans la session de connexion.
  const myAvatarUrl = me.data ? (me.data.avatarUrl ?? null) : (auth?.user.avatarUrl ?? null);
  const myAura = useMemo(() => compactAura(resolveAura(me.data?.signature, tierOfBadges(me.data?.badges))), [me.data]);
  const myRing = signatureRing(me.data?.signature);
  const unreadCount = useUnreadNotifications(!!auth);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams<{ kind?: string }>();
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  // Type de recherche affiché, repris en surbrillance dans le tiroir.
  const currentSearchType: SearchType | null = pathname === '/search' ? (isSearchType(searchParams.kind) ? searchParams.kind : 'anime') : null;

  const [open, setOpen] = useState(false);
  /** Parents des sous-éventails ouverts, du plus haut au plus bas. */
  const [trail, setTrail] = useState<readonly IMobileNavItem[]>([]);
  const [hotIndex, setHotIndex] = useState<number | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const [labelSizes, setLabelSizes] = useState<ILabelSize[]>([]);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const readingFullscreen = useReadingChromeHidden();
  const handleStartY = useRef(0);

  const items = trail.length > 0 ? (trail[trail.length - 1]!.children ?? MEMBER_FAN) : MEMBER_FAN;
  const slots = useMemo(() => computeFanSlots(items.length), [items.length]);

  // État lu par les gestes : les gestionnaires ne doivent pas se reconstruire à chaque rendu.
  const live = useRef({ open, trail, items, slots, hotIndex });
  live.current = { open, trail, items, slots, hotIndex };
  const gesture = useRef({ startX: 0, startY: 0, startedOpen: false, dragging: false, slid: false, ring: 'inner' as FanRing });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    holdTimer.current = null;
    dwellTimer.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setOpen(false);
    setTrail([]);
    setHotIndex(null);
    gesture.current.ring = 'inner';
  }, [clearTimers]);

  const openFan = useCallback(() => {
    gesture.current.ring = 'inner';
    setOpen(true);
    haptic.open();
  }, []);

  const push = useCallback((parent: IMobileNavItem) => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
    gesture.current.ring = 'inner';
    setTrail((current) => [...current, parent]);
    setHotIndex(null);
    haptic.push();
  }, []);

  const pop = useCallback(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = null;
    gesture.current.ring = 'inner';
    setTrail((current) => current.slice(0, -1));
    setHotIndex(null);
    haptic.back();
  }, []);

  const choose = useCallback(
    (target: IMobileNavItem) => {
      if (isSoonEntry(target)) {
        close();
        showSoon(target.label);
        return;
      }
      if (target.children) return push(target);
      close();
      haptic.choose();
      openTarget(target);
    },
    [close, push],
  );

  /** Vise une action : après `DWELL_MS` sur un sous-menu, doigt toujours posé, son sous-éventail s'ouvre. */
  const aim = useCallback(
    (index: number | null) => {
      if (live.current.hotIndex === index) return;
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
      setHotIndex(index);
      live.current.hotIndex = index;
      if (index === null) return;
      haptic.aim();
      const target = live.current.items[index];
      if (target?.children) {
        dwellTimer.current = setTimeout(() => {
          const stillHot = live.current.items[live.current.hotIndex ?? -1];
          if (stillHot === target && gesture.current.dragging) push(target);
        }, DWELL_MS);
      }
    },
    [push],
  );

  const onGrant = (event: GestureResponderEvent) => {
    const g = gesture.current;
    g.startX = event.nativeEvent.pageX;
    g.startY = event.nativeEvent.pageY;
    g.startedOpen = live.current.open;
    g.dragging = false;
    g.slid = false;
    if (!g.startedOpen) {
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        g.dragging = true;
        openFan();
      }, HOLD_MS);
    }
  };

  const onMove = (event: GestureResponderEvent) => {
    const g = gesture.current;
    const dx = event.nativeEvent.pageX - g.startX;
    const dy = event.nativeEvent.pageY - g.startY;
    // Un doigt qui bouge avant la fin de l'appui long n'ouvre pas l'éventail : c'est un geste de défilement manqué.
    if (!live.current.open) return;
    if (Math.hypot(dx, dy) > SLIDE_PX) g.slid = true;
    if (!g.dragging && g.slid && g.startedOpen) g.dragging = true;
    if (!g.dragging) return;
    const picked = pickSlot({ dx, dy, slots: live.current.slots, ring: g.ring, hotIndex: live.current.hotIndex });
    g.ring = picked.ring;
    aim(picked.index);
  };

  const onRelease = () => {
    const g = gesture.current;
    if (holdTimer.current) {
      // Tap court sur le bouton fermé : ouvre l'éventail et le laisse ouvert.
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      openFan();
      return;
    }
    if (g.dragging) {
      g.dragging = false;
      const aimed = live.current.hotIndex;
      const target = aimed === null ? undefined : live.current.items[aimed];
      if (target) choose(target);
      // Glissé puis relâché dans le vide : retour. Appui long sans bouger : l'éventail reste ouvert.
      else if (g.slid) (live.current.trail.length > 0 ? pop : close)();
      return;
    }
    if (g.startedOpen) (live.current.trail.length > 0 ? pop : close)();
  };

  const onTerminate = () => {
    gesture.current.dragging = false;
    close();
  };

  // Une navigation referme l'éventail ; le bouton retour d'Android le referme (ou remonte d'un sous-menu) avant de quitter.
  useEffect(() => {
    close();
  }, [pathname, close]);
  useEffect(() => clearTimers, [clearTimers]);
  // Clavier ouvert (saisie d'une recherche) : la barre ne reste pas posée par-dessus les touches.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (live.current.trail.length > 0) pop();
      else close();
      return true;
    });
    return () => subscription.remove();
  }, [open, close, pop]);

  // Les libellés sont mesurés puis placés là où ils ne recouvrent ni un bouton, ni un autre libellé, ni la barre.
  useEffect(() => setLabelSizes([]), [open, items]);
  const labelCenters = useMemo(() => {
    const measured = labelSizes.length === items.length && labelSizes.every((size) => size?.w > 0);
    return open && measured ? placeLabels(slots, labelSizes, width) : null;
  }, [open, labelSizes, items.length, slots, width]);

  if (!auth || keyboardShown) return null;

  // Plein écran de lecture : plus de barre, une languette fine au bord bas. Un appui ou un glissé vers le haut
  // rend la navigation ; elle revient aussi seule en bas de page.
  if (readingFullscreen) {
    return (
      <View pointerEvents="box-none" style={[styles.handleZone, { bottom: insets.bottom }]}>
        <View
          accessibilityRole="button"
          accessibilityLabel="Afficher la navigation"
          onStartShouldSetResponder={() => true}
          onResponderGrant={(event) => {
            handleStartY.current = event.nativeEvent.pageY;
          }}
          onResponderRelease={(event) => {
            // appui, ou glissé vers le haut : dans les deux cas on rend la navigation
            if (event.nativeEvent.pageY - handleStartY.current <= 10) setReadingChromeHidden(false);
          }}
          style={styles.handleHit}
        >
          <View style={styles.handle} />
        </View>
      </View>
    );
  }

  const hubX = width / 2;
  const hubY = overlayHeight - insets.bottom - HUB_FROM_BOTTOM;
  const inSubmenu = trail.length > 0;
  const activeTabId = findActiveTabId(MEMBER_TABS, pathname);
  const titleY = Math.min(0, ...slots.map((slot) => slot.y)) - 86;
  const hot = hotIndex !== null ? slots[hotIndex] : undefined;
  const name = auth.user.displayName ?? auth.user.username;

  const renderTab = (tab: IMobileNavItem) => {
    const active = tab.id === activeTabId;
    return (
      <Pressable
        key={tab.id}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        // « Recherche » ne mène pas à un écran unique : elle demande d'abord ce qu'on cherche.
        onPress={() => (tab.id === 'search' ? setSearchSheetOpen(true) : openTarget(tab))}
        // Pas d'ondulation grise : elle ressemble à l'onglet actif. Le toucher se lit par l'opacité.
        android_ripple={{ color: 'transparent' }}
        style={({ pressed }) => [styles.tab, active && styles.tabActive, active && !palette.isDefault && { backgroundColor: alpha(palette.primary, 0.16) }, pressed && styles.tabPressed]}
      >
        <LogoIcon name={tab.icon} size={24} />
        <Text style={[styles.tabLabel, !palette.isDefault && { color: palette.mutedForeground }, active && { color: palette.primary }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.bar, !palette.isDefault && { backgroundColor: palette.muted }, { height: BAR_HEIGHT + insets.bottom, paddingBottom: 6 + insets.bottom }]}>
        {renderTab(MEMBER_TABS[0]!)}
        {renderTab(MEMBER_TABS[1]!)}
        <View style={styles.hub}>
          {/* Aura derrière le bouton : décor seulement, le geste reste celui du bouton. Éteinte quand l'éventail est ouvert. */}
          {myAura && !open ? (
            <View pointerEvents="none" style={styles.fabAura}>
              <AvatarAura size={FAB_SIZE} radius={FAB_SIZE / 2} aura={myAura} compact>
                <View style={{ width: FAB_SIZE, height: FAB_SIZE }} />
              </AvatarAura>
            </View>
          ) : null}
          <View
            accessibilityRole="button"
            accessibilityLabel={open ? (inSubmenu ? 'Retour' : 'Fermer les actions') : 'Ouvrir les actions rapides'}
            accessibilityState={{ expanded: open }}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={onGrant}
            onResponderMove={onMove}
            onResponderRelease={onRelease}
            onResponderTerminate={onTerminate}
            style={[styles.fab, !palette.isDefault && { borderColor: palette.primary, backgroundColor: palette.muted }, !open && myRing && { borderColor: myRing.borderColor }, open && styles.fabOpen, open && !palette.isDefault && { borderColor: palette.primary }, open && styles.fabHidden]}
          >
            {inSubmenu ? (
              <View style={[styles.fabBack, !palette.isDefault && { backgroundColor: palette.primary }]}>
                <Ionicons name="chevron-back" size={30} color={palette.primaryForeground} />
              </View>
            ) : open ? (
              <HubLogo />
            ) : myAvatarUrl ? (
              <Image source={{ uri: myAvatarUrl }} style={styles.fabFill} contentFit="cover" />
            ) : (
              <View style={styles.fabInitial}>
                <ThemedText type="subtitle">{name.slice(0, 1).toUpperCase()}</ThemedText>
              </View>
            )}
          </View>
          {/* Pastille sur le bouton central, éventail fermé : il y a quelque chose à voir dans Notifications. */}
          {!open ? <CountBadge count={unreadCount} style={styles.countOnHub} /> : null}
        </View>
        {renderTab(MEMBER_TABS[2]!)}
        {renderTab(MEMBER_TABS[3]!)}
      </View>

      {open ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlay]} onLayout={(event) => setOverlayHeight(event.nativeEvent.layout.height)}>
          <Pressable style={[styles.veil, { bottom: BAR_HEIGHT + insets.bottom }]} onPress={close} accessibilityLabel="Fermer les actions" />
          {overlayHeight > 0 ? (
            <>
              {/* Le bouton central dépasse de la barre : le voile le coupait. Sa copie est posée au-dessus du voile, sous les actions. */}
              <View pointerEvents="none" style={[styles.hubGhost, { left: hubX - FAB_SIZE / 2, top: hubY - FAB_SIZE / 2 }]}>
                {inSubmenu ? (
                  <View style={styles.fabBack}>
                    <Ionicons name="chevron-back" size={30} color={Colors.primaryForeground} />
                  </View>
                ) : (
                  <HubLogo />
                )}
              </View>
              {hot ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.ray,
                    !palette.isDefault && { backgroundColor: palette.primary },
                    {
                      left: hubX,
                      top: hubY - 1.5,
                      width: Math.hypot(hot.x, hot.y) - 29,
                      transform: [{ rotate: `${(Math.atan2(hot.y, hot.x) * 180) / Math.PI}deg` }],
                    },
                  ]}
                />
              ) : null}
              {items.map((entry, index) => (
                <FanAct
                  key={`${trail.length}-${entry.id}`}
                  entry={entry}
                  badge={entry.id === 'notifications' ? unreadCount : 0}
                  slot={slots[index]!}
                  index={index}
                  hot={hotIndex === index}
                  hubX={hubX}
                  hubY={hubY}
                  onPress={() => {
                    if (!gesture.current.dragging) choose(entry);
                  }}
                />
              ))}
              {/* Libellés dans une couche à part : ils passent toujours au-dessus de toutes les actions. */}
              {items.map((entry, index) => {
                const center = labelCenters?.[index];
                const size = labelSizes[index];
                return (
                  <View
                    key={`${trail.length}-${entry.id}-label`}
                    pointerEvents="none"
                    onLayout={(event) => {
                      const { width: w, height: h } = event.nativeEvent.layout;
                      setLabelSizes((current) => {
                        if (current[index]?.w === w && current[index]?.h === h) return current;
                        const next = current.slice();
                        next[index] = { w, h };
                        return next;
                      });
                    }}
                    style={[
                      styles.label,
                      hotIndex === index && styles.labelHot,
                      hotIndex === index && !palette.isDefault && { backgroundColor: palette.primary },
                      center && size
                        ? { left: hubX + center.x - size.w / 2, top: hubY + center.y - size.h / 2, opacity: 1 }
                        : { left: 0, top: 0, opacity: 0 },
                    ]}
                  >
                    <Text style={[styles.labelText, hotIndex === index && { color: Colors.primaryForeground }]}>{entry.label}</Text>
                  </View>
                );
              })}
              {inSubmenu ? (
                <View pointerEvents="none" style={[styles.titleWrap, { left: 0, right: 0, top: hubY + titleY }]}>
                  <View style={[styles.title, !palette.isDefault && { backgroundColor: palette.primary }]}>
                    <Text style={styles.titleText}>{trail.map((step) => step.label).join(' › ')}</Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      <SearchTypeSheet open={searchSheetOpen} current={currentSearchType} onClose={() => setSearchSheetOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundElement,
  },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 14, paddingVertical: 6 },
  tabPressed: { opacity: 0.55 },
  tabActive: { backgroundColor: 'rgba(0, 153, 255, 0.16)' },
  tabLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textSecondary },
  hub: { width: 96, height: 48 },
  fabAura: { position: 'absolute', bottom: 2, left: (96 - FAB_SIZE) / 2, width: FAB_SIZE, height: FAB_SIZE },
  fab: {
    position: 'absolute',
    bottom: 2,
    left: (96 - FAB_SIZE) / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
    elevation: 8,
  },
  handleZone: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  handleHit: { width: 180, height: 36, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  handle: { width: 64, height: 4, borderRadius: 2, backgroundColor: 'rgba(0, 153, 255, 0.7)' },
  fabOpen: { transform: [{ scale: 1.12 }], borderColor: Colors.primary },
  fabFill: { width: '100%', height: '100%' },
  fabLogoWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  fabLogo: { width: 40, height: 42, transform: [{ translateY: -1 }] },
  fabHidden: { opacity: 0 },
  hubGhost: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
    transform: [{ scale: 1.12 }],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  fabInitial: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundSelected },
  fabBack: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  /** Les cartes des écrans ont une élévation : sans une élévation supérieure, elles se dessinent par-dessus le voile. */
  overlay: { elevation: 12, zIndex: 12 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(2, 6, 18, 0.86)' },
  actWrap: { position: 'absolute', width: ACT_SIZE, height: ACT_SIZE },
  act: {
    width: ACT_SIZE,
    height: ACT_SIZE,
    borderRadius: ACT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 6,
  },
  actAccent: { borderColor: Colors.primary },
  actHot: { backgroundColor: Colors.primary },
  dwell: { position: 'absolute', left: -7, top: -7 },
  more: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
  },
  count: {
    position: 'absolute',
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
  },
  countText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 10, lineHeight: 12 },
  countOnAct: { top: -4, right: -4 },
  countOnHub: { top: -2, right: 8 },
  ray: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: Colors.primary, transformOrigin: '0% 50%' },
  label: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(3, 10, 29, 0.88)',
  },
  labelHot: { backgroundColor: Colors.primary },
  labelText: { fontFamily: Fonts.semibold, fontSize: 12, color: Colors.text },
  titleWrap: { position: 'absolute', alignItems: 'center' },
  title: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 9999, backgroundColor: Colors.primary },
  titleText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primaryForeground },
});
