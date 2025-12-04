import React, { createContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export type Theme = "light" | "dark";
export type Contrast = "normal" | "high";
export type FontSize = "small" | "medium" | "large";
export type UXVariant = "default" | "a" | "b";

interface AppSettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  contrast: Contrast;
  setContrast: (contrast: Contrast) => void;
  uxVariant: UXVariant;
  setUXVariant: (uxVariant: UXVariant) => void;
  fontSize: FontSize;
  setFontSize: (fontSize: FontSize) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(
  undefined,
);

interface AppSettingsProviderProps {
  children: ReactNode;
}

const AppSettingsProvider: React.FC<AppSettingsProviderProps> = ({
  children,
}) => {
  const systemTheme = useColorScheme();

  // Set the initial theme to the system theme, if not available, default to light
  const [theme, setTheme] = useState<Theme>(systemTheme || "light");
  const [contrast, setContrast] = useState<Contrast>("normal");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [uxVariant, setUXVariant] = useState<UXVariant>("default");

  useEffect(() => {
    const loadSettings = async () => {
      const storedTheme = (await AsyncStorage.getItem("theme")) as Theme | null;
      const storedContrast = (await AsyncStorage.getItem(
        "contrast",
      )) as Contrast | null;
      const storedFontSize = (await AsyncStorage.getItem(
        "fontSize",
      )) as FontSize | null;

      if (storedTheme) setTheme(storedTheme);
      if (storedContrast) setContrast(storedContrast);
      if (storedFontSize) setFontSize(storedFontSize);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("theme", theme);
    AsyncStorage.setItem("contrast", contrast);
    AsyncStorage.setItem("fontSize", fontSize);
  }, [theme, contrast, fontSize]);

  return (
    <AppSettingsContext.Provider
      value={{
        theme,
        setTheme,
        contrast,
        setContrast,
        fontSize,
        setFontSize,
        uxVariant,
        setUXVariant,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export { AppSettingsContext, AppSettingsProvider };
