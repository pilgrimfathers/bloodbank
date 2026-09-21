import { StyleSheet, View } from 'react-native';
import { palette, radius } from '@/src/theme';
import Text from './Text';

type Props = {
  bloodType: string;
  size?: 'sm' | 'md' | 'lg';
  // Muted when the donor/request isn't actionable right now.
  muted?: boolean;
};

const SIZES = {
  sm: { box: 40, font: 16 },
  md: { box: 52, font: 20 },
  lg: { box: 72, font: 28 },
};

// Blood group shown like the label on a blood bag.
export default function BloodMark({ bloodType, size = 'md', muted }: Props) {
  const { box, font } = SIZES[size];
  return (
    <View style={[
      styles.mark,
      { width: box, height: box },
      muted && { backgroundColor: '#EFEAE7' },
    ]}>
      <Text
        variant="title"
        color={muted ? palette.inkMuted : palette.blood}
        style={{ fontSize: font, lineHeight: font + 4, fontFamily: 'AnekMalayalam_800ExtraBold' }}
      >
        {bloodType || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderRadius: radius.md,
    backgroundColor: palette.bloodTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
