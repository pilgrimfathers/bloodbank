import { StyleSheet, View } from 'react-native';
import { palette, radius, space } from '@/src/theme';
import Text from './Text';

export type Tone = 'blood' | 'leaf' | 'turmeric' | 'kasavu' | 'info' | 'muted';

const TONES: Record<Tone, { fg: string; bg: string }> = {
  blood: { fg: palette.blood, bg: palette.bloodTint },
  leaf: { fg: palette.leaf, bg: palette.leafTint },
  turmeric: { fg: palette.turmeric, bg: palette.turmericTint },
  kasavu: { fg: '#8A6A22', bg: palette.kasavuTint },
  info: { fg: palette.info, bg: palette.infoTint },
  muted: { fg: palette.inkMuted, bg: '#EFEAE7' },
};

// Small status tag. Sentence case, tinted background, never shouts.
export default function Pill({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  const { fg, bg } = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text variant="caption" color={fg} style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'AnekMalayalam_600SemiBold',
  },
});
