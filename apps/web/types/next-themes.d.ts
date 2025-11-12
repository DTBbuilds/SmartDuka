declare module "next-themes" {
  import type { ReactNode } from "react";

  export type Theme = "dark" | "light" | string;

  export interface ThemeProviderProps {
    attribute?: string;
    defaultTheme?: Theme;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    themes?: Theme[];
    value?: Theme;
    children: ReactNode;
  }

  export interface UseThemeOutput {
    theme?: Theme;
    setTheme: (theme: Theme) => void;
    systemTheme?: Theme;
  }

  export const ThemeProvider: React.ComponentType<ThemeProviderProps>;
  export function useTheme(): UseThemeOutput;
}
