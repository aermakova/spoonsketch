export const fonts = {
  display: 'Fraunces_400Regular',
  displayBold: 'Fraunces_700Bold',
  hand: 'Caveat_400Regular',
  handBold: 'Caveat_700Bold',
  body: 'Nunito_400Regular',
  bodyMedium: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
} as const;

export type FontKey = keyof typeof fonts;
