import { useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { fonts, palette, radius, space } from '@/src/theme';
import Text from './ui/Text';

type Props = TextInputProps & {
  label: string;
  hint?: string;
};

export default function Field({ label, hint, style, onFocus, onBlur, ...inputProps }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color={palette.inkMuted} style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          inputProps.multiline && styles.multiline,
          focused && styles.focused,
          style,
        ]}
        placeholderTextColor={palette.inkFaint}
        selectionColor={palette.blood}
        accessibilityLabel={label}
        onFocus={e => { setFocused(true); onFocus?.(e); }}
        onBlur={e => { setFocused(false); onBlur?.(e); }}
        {...inputProps}
      />
      {hint && <Text variant="caption" color={palette.inkFaint} style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: space.lg,
  },
  label: {
    marginBottom: space.xs + 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: palette.line,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
    borderRadius: radius.sm,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: palette.ink,
    backgroundColor: palette.surface,
  },
  focused: {
    borderColor: palette.blood,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: space.xs,
  },
});
