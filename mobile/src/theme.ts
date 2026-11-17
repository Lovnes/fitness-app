/** Design tokens — orange / black / white palette from the reference UI. */
export const colors = {
  orange: '#FF6A13',
  orangeDark: '#E85A05',
  orangeSoft: '#FFF0E6',
  orangeLine: '#FFD9C2',
  ink: '#121212',
  ink2: '#1F1F22',
  ink3: '#2C2C30',
  gray: '#8B8B93',
  gray2: '#B9B9C0',
  line: '#ECECEF',
  bg: '#F5F5F7',
  white: '#FFFFFF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#22A867',
  successSoft: '#E6F6EE',
} as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const radius = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Minimum touch target (dp) — NFR-2. */
export const TOUCH = 48;

/** Display formatting. Values are stored at full precision; rounding happens only here (defect D-02). */
export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString('en-US'),
  one: (n: number) => (Math.round(n * 10) / 10).toFixed(1),
  kg: (n: number) => `${Number.isInteger(n) ? n : (Math.round(n * 10) / 10).toFixed(1)}`,
  clock: (minutes: number) => {
    const secs = Math.floor(minutes * 60);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const mm = `${m}`.padStart(2, '0');
    const ss = `${s}`.padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  },
  date: (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
  time: (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
};
