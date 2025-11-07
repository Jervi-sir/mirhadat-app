// ui/theme.ts
import { Platform } from "react-native";

/* -------------------------------- Colors -------------------------------- */
export const colors = {
  primary: "#007B7A",
  primary600: "#006B6A",
  primary700: "#005F5E",
  primaryTint: "rgba(0,123,122,0.12)",

  ink: "#0D0E0C",                     // main text
  ink600: "#1B1C19",
  ink500: "#2A2B28",
  ink300: "rgba(13,14,12,0.64)",      // secondary
  ink200: "rgba(13,14,12,0.44)",      // tertiary
  inkDivider: "rgba(13,14,12,0.12)",  // borders

  paper: "#FAF8F5",                   // app bg
  surface: "#FFFFFF",                 // cards, sheets
  surfaceAlt: "#F3F1ED",

  success: "#22C55E",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#3B82F6",

  overlay: "rgba(0,0,0,0.5)",
} as const;

/* ------------------------------- Spacing/Radii ------------------------------ */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius  = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/* --------------------------------- Type --------------------------------- */
export const typography = {
  display:   { fontSize: 34, lineHeight: 40, fontWeight: "800" as const },
  h1:        { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  h2:        { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  h3:        { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  body:      { fontSize: 16, lineHeight: 22, fontWeight: "500" as const },
  bodyMuted: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  label:     { fontSize: 12, lineHeight: 16, fontWeight: "600" as const },
  caption:   { fontSize: 11, lineHeight: 14, fontWeight: "500" as const },
} as const;

/* ------------------------------- Elevation -------------------------------- */
export const elevation = [
  { shadowOpacity: 0,    elevation: 0 },
  { shadowOpacity: 0.07, elevation: 1 },
  { shadowOpacity: 0.09, elevation: 2 },
  { shadowOpacity: 0.12, elevation: 4 },
  { shadowOpacity: 0.14, elevation: 6 },
] as const;

/* ------------------------------ Semantic map ------------------------------ */
export const theme = {
  colors,
  spacing,
  radius,
  typography,
  elevation,
  hitSlop: { top: 8, right: 8, bottom: 8, left: 8 } as const,

  bg: {
    app: colors.paper,
    screen: colors.paper,
    surface: colors.surface,
    surfaceAlt: colors.surfaceAlt,
    primaryTint: colors.primaryTint,
  },

  text: {
    default: colors.ink,
    strong: colors.ink500,
    secondary: colors.ink300,
    tertiary: colors.ink200,
    onPrimary: "#FFFFFF",
  },

  border: {
    subtle: colors.inkDivider,
    focus: colors.primary,
    error: colors.error,
  },

  state: {
    press: "rgba(13,14,12,0.06)",
    ripple: "rgba(0,0,0,0.08)",
  },
} as const;

export type Theme = typeof theme;

/* -------------------------------- Helpers -------------------------------- */
export const withAlpha = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

export const pressableStyles = (pressed: boolean) => ({ opacity: pressed ? 0.9 : 1 });

export const shadow = (level: 0|1|2|3|4 = 1) => {
  const sel = elevation[level];
  if (Platform.OS === "android") return { elevation: sel.elevation };
  const y = [0, 1, 2, 4, 6][level];
  const r = [0, 2, 3, 6, 10][level];
  return { shadowColor: "#000", shadowOpacity: sel.shadowOpacity, shadowRadius: r, shadowOffset: { width: 0, height: y } };
};

/* ----------------------------- Simple aliases ----------------------------- */
// Optional: handy aliases to keep component code tidy.
export const S = spacing;   // S.lg
export const R = radius;    // R.lg
export const T = typography;// T.h2
export const C = colors;    // C.primary
