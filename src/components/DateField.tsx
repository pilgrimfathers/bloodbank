import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, space } from '@/src/theme';
import { useI18n } from '../i18n';
import Text from './ui/Text';

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  hint?: string;
  maximumDate?: Date;
  // Optional fields get a clear button so "no date" stays possible.
  clearable?: boolean;
};

// Dates are picked, never typed, so there is no format to get wrong.
export default function DateField({ label, value, onChange, hint, maximumDate, clearable }: Props) {
  const { t, formatDate, language } = useI18n();
  const [open, setOpen] = useState(false);
  const locale = language === 'ml' ? 'ml-IN' : 'en-IN';

  const pick = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) onChange(date);
  };

  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: value ?? new Date(), mode: 'date', maximumDate, onChange: pick });
    } else {
      setOpen(prev => !prev);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color={palette.inkMuted} style={styles.label}>{label}</Text>
      <View style={[styles.input, open && styles.focused]}>
        <Pressable
          style={styles.button}
          onPress={show}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: value ? formatDate(value) : t('date.pick') }}
        >
          <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={palette.inkMuted} />
          <Text color={value ? palette.ink : palette.inkFaint} style={styles.value}>
            {value ? formatDate(value) : t('date.pick')}
          </Text>
        </Pressable>
        {clearable && value && (
          <Pressable
            onPress={() => { onChange(null); setOpen(false); }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('date.clear')}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={palette.inkFaint} />
          </Pressable>
        )}
      </View>
      {open && Platform.OS === 'ios' && (
        <View style={styles.inline}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="inline"
            maximumDate={maximumDate}
            locale={locale}
            accentColor={palette.blood}
            themeVariant="light"
            onChange={pick}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.done} accessibilityRole="button">
            <Text variant="bodyStrong" color={palette.blood}>{t('date.done')}</Text>
          </Pressable>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1.5,
    borderColor: palette.line,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
  },
  focused: {
    borderColor: palette.blood,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
  },
  value: {
    flex: 1,
  },
  inline: {
    marginTop: space.sm,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: 'hidden',
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  hint: {
    marginTop: space.xs,
  },
});
