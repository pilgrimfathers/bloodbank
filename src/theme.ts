import { TextStyle } from 'react-native';

// "Kerala donor card": deep venous red, warm ink, and kasavu gold for
// milestones. Green/turmeric carry eligibility state only.
export const palette = {
  blood: '#A3142B',
  bloodDark: '#7C0E20',
  bloodTint: '#F8E7E9',
  ink: '#2B1B1E',
  inkMuted: '#6E5F61',
  inkFaint: '#A3979A',
  kasavu: '#B8913A',
  kasavuTint: '#F6EFDF',
  leaf: '#2E7D50',
  leafTint: '#E4F1E9',
  turmeric: '#C26A12',
  turmericTint: '#FBEEDD',
  paper: '#F1E9E5',
  surface: '#FFFFFF',
  line: '#E6DBD6',
  info: '#2F5D8A',
  infoTint: '#E6EEF6',
};

export const fonts = {
  regular: 'AnekMalayalam_400Regular',
  medium: 'AnekMalayalam_500Medium',
  semibold: 'AnekMalayalam_600SemiBold',
  bold: 'AnekMalayalam_700Bold',
  extrabold: 'AnekMalayalam_800ExtraBold',
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Radii follow hierarchy: large for the donor card, small for inputs and rows.
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
