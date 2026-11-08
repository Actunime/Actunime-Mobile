import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { parseBio, type IBioSpan } from '@/lib/bio';

/** Spoiler : masqué par un aplat, un appui le montre ou le recache. */
function Spoiler({ span }: Readonly<{ span: IBioSpan }>) {
  const [shown, setShown] = useState(false);
  return (
    <Text onPress={() => setShown((value) => !value)} accessibilityRole="button" accessibilityLabel={shown ? 'Masquer le spoiler' : 'Afficher le spoiler'} style={shown ? styles.spoilerShown : styles.spoilerHidden}>
      {span.text}
    </Text>
  );
}

function Spans({ spans }: Readonly<{ spans: IBioSpan[] }>) {
  return (
    <>
      {spans.map((span, i) =>
        span.spoiler ? (
          <Spoiler key={i} span={span} />
        ) : (
          <Text key={i} style={[span.bold && styles.bold, span.italic && styles.italic]}>
            {span.text}
          </Text>
        ),
      )}
    </>
  );
}

/** Bio d'un membre avec la mise en forme du site : gras, italique, titres, citation, listes, spoilers cliquables. */
export function BioContent({ children }: Readonly<{ children: string }>) {
  const blocks = parseBio(children);
  return (
    <View style={styles.root}>
      {blocks.map((block, i) => {
        if (!('spans' in block)) {
          return (
            <View key={i} style={styles.list}>
              {block.items.map((item, j) => (
                <View key={j} style={styles.item}>
                  <Txt size="sm" color={Tw.color.mutedForeground}>
                    {block.type === 'ul' ? '•' : `${j + 1}.`}
                  </Txt>
                  <Txt size="sm" color={Tw.color.mutedForeground} style={styles.flex}>
                    <Spans spans={item} />
                  </Txt>
                </View>
              ))}
            </View>
          );
        }
        if (block.type === 'h2' || block.type === 'h3') {
          return (
            <Txt key={i} size={block.type === 'h2' ? 'base' : 'sm'} weight="bold">
              <Spans spans={block.spans} />
            </Txt>
          );
        }
        if (block.type === 'quote') {
          return (
            <View key={i} style={styles.quote}>
              <Txt size="sm" color={Tw.color.mutedForeground} style={styles.italic}>
                <Spans spans={block.spans} />
              </Txt>
            </View>
          );
        }
        return (
          <Txt key={i} size="sm" color={Tw.color.mutedForeground}>
            <Spans spans={block.spans} />
          </Txt>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  flex: { flex: 1 },
  bold: { fontWeight: '700', color: Tw.color.foreground },
  italic: { fontStyle: 'italic' },
  list: { gap: 2 },
  item: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  quote: { borderLeftWidth: 2, borderLeftColor: Tw.color.border, paddingLeft: 12 },
  spoilerHidden: { backgroundColor: Tw.color.foreground, color: 'transparent', borderRadius: 3 },
  spoilerShown: { backgroundColor: Tw.color.muted, color: Tw.color.foreground, borderRadius: 3 },
});
