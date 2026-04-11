// src/theme/colors.ts

export const darkColors = {
  background:      '#111210',
  surface:         '#1A1C1A',
  surfaceElevated: '#161A18',
  border:          '#0F2E28',
  borderSubtle:    '#1A2420',
  progressTrack:   '#222420',
  dragHandle:      '#2A2C2A',
  primary:         '#1D9E75',
  primaryDark:     '#0F6E56',
  accent:          '#EF9F27',
  neutral:         '#888780',
  placeholder:     '#555555',
  textPrimary:     '#EEF2F0',
  destructive:     '#EF4444',
};

export const lightColors: typeof darkColors = {
  background:      '#F4F7F5',
  surface:         '#FFFFFF',
  surfaceElevated: '#F0F5F2',
  border:          '#D0E8E0',
  borderSubtle:    '#D8EBE3',
  progressTrack:   '#E5EDE9',
  dragHandle:      '#C8D4CE',
  primary:         '#1D9E75',
  primaryDark:     '#0F6E56',
  accent:          '#EF9F27',
  neutral:         '#888780',
  placeholder:     '#AAAAAA',
  textPrimary:     '#1A1C1A',
  destructive:     '#EF4444',
};

export type Colors = typeof darkColors;
