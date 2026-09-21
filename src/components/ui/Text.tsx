import { Text as RNText, TextProps } from 'react-native';
import { palette, type, TypeVariant } from '@/src/theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

// App text: every Text needs an explicit fontFamily in React Native, so all
// copy goes through here to pick up the theme's type scale.
export default function Text({ variant = 'body', color = palette.ink, style, ...props }: Props) {
  return <RNText style={[type[variant], { color }, style]} {...props} />;
}
