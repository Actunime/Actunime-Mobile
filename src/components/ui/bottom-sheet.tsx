import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';

interface IBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** En-tête libre à la place du titre (bouton retour, bloc de l'œuvre…). */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Hauteur repliée en dp : le tiroir s'ouvre à cette hauteur et se déploie en plein écran en le tirant vers le haut. */
  collapsedHeight?: number;
  /** Hauteur minimale (`min-h-[55vh]` du tiroir des filtres), en fraction de l'écran. */
  minHeight?: number;
  /** Hauteur maximale en fraction de l'écran (`max-h-[80vh]` par défaut, comme le tiroir du site). */
  maxHeight?: number;
  /** Signale le passage replié / déployé (le contenu replié ne défile pas). */
  onExpandedChange?: (expanded: boolean) => void;
  /** Chaque incrément déploie un tiroir à deux hauteurs (le contenu demande de la place : défilement commencé dans le tiroir replié). */
  expandSignal?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

const SCREEN = Dimensions.get('window').height;

/**
 * Tiroir du bas, transposé du `Drawer` du site (vaul) : fond `bg-background`, coins `rounded-t-xl`, poignée
 * `h-1 w-[100px] bg-muted`, voile sombre. Le geste natif remplace le glisser de vaul : tirer la poignée vers le
 * bas ferme (ou replie un tiroir déployé), vers le haut déploie un tiroir à deux hauteurs.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  header,
  footer,
  children,
  collapsedHeight,
  minHeight,
  maxHeight = 0.8,
  onExpandedChange,
  expandSignal,
  contentStyle,
}: Readonly<IBottomSheetProps>) {
  const insets = useSafeAreaInsets();
  const [, setExpanded] = useState(false);
  const translate = useRef(new Animated.Value(0)).current;
  // Déployé, le tiroir garde une marge en haut : il ne touche pas la barre d'état (où l'on tire les notifications
  // d'Android) et le fond assombri reste visible, on voit qu'on est dans un tiroir qu'on peut fermer.
  const expandedHeight = Math.min(SCREEN * 0.9, SCREEN - insets.top - 56);
  const collapsedPx = collapsedHeight ? Math.min(collapsedHeight, expandedHeight) : 0;
  const heightAnim = useRef(new Animated.Value(collapsedPx)).current;
  const expandedRef = useRef(false);

  useEffect(() => {
    if (open) {
      expandedRef.current = false;
      setExpanded(false);
      translate.setValue(0);
      heightAnim.setValue(collapsedPx);
    }
  }, [open, translate]); // eslint-disable-line react-hooks/exhaustive-deps -- `heightAnim` et la hauteur repliée ne changent pas à l'ouverture

  const setExpand = (value: boolean) => {
    expandedRef.current = value;
    // le tiroir s'agrandit (ou se replie) en glissant, il ne saute pas
    if (collapsedHeight) {
      Animated.timing(heightAnim, {
        toValue: value ? expandedHeight : collapsedPx,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    setExpanded(value);
    onExpandedChange?.(value);
  };

  // Défilement commencé dans le tiroir replié : il se déploie d'abord en (presque) plein écran.
  const lastSignal = useRef(0);
  useEffect(() => {
    if (expandSignal === undefined || expandSignal === lastSignal.current) return;
    lastSignal.current = expandSignal;
    if (collapsedHeight && !expandedRef.current) setExpand(true);
  }, [expandSignal]); // eslint-disable-line react-hooks/exhaustive-deps -- seul un nouveau signal déploie

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_e, g) => translate.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        if (g.dy < -40 && collapsedHeight && !expandedRef.current) setExpand(true);
        else if (g.dy > 80 || g.vy > 1.2) {
          if (collapsedHeight && expandedRef.current) setExpand(false);
          else onClose();
        }
      },
    }),
  ).current;


  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Fermer" />
      <KeyboardAvoidingView behavior="padding" style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom, maxHeight: collapsedHeight ? expandedHeight : SCREEN * maxHeight, transform: [{ translateY: translate }] },
            collapsedHeight ? { height: heightAnim } : null,
            minHeight !== undefined && { minHeight: SCREEN * minHeight },
          ]}
        >
          <View {...pan.panHandlers}>
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>
            {header ?? (title ? (
              <View style={styles.header}>
                <Txt size="base" weight="medium" style={styles.title}>
                  {title}
                </Txt>
              </View>
            ) : null)}
          </View>
          <View style={[styles.content, contentStyle]}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Tw.color.background,
    borderTopLeftRadius: Tw.radius.xl,
    borderTopRightRadius: Tw.radius.xl,
    borderTopWidth: 1,
    borderColor: Tw.color.border,
  },
  handleZone: { paddingTop: 16, paddingBottom: 4, alignItems: 'center' },
  handle: { width: 100, height: 4, borderRadius: 2, backgroundColor: Tw.color.muted },
  header: { padding: 16, gap: 2 },
  title: { textAlign: 'center' },
  content: { flexShrink: 1, flexGrow: 1 },
  footer: { flexDirection: 'row', gap: 8, padding: 16 },
});
