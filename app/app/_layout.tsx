import { Slot } from "expo-router";
import { Portal, ThemeProvider } from "react-native-paper";
import { Themes, MD3ThemeExtended } from "@/constants/Themes";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { useEffect } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import useAppSettings from "@/hooks/useAppSettings";
import { useMemo } from "react";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "./ctx";
import { SnackbarProvider } from "@/context/SnackbarContext";
import { NavigationDataProvider } from "@/context/NavigationDataContext";
import { NotificationDataProvider } from "@/context/NotificationsContext";
import { TripImageContextProvider } from "@/context/TripImageContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { ShouldRefreshProvider } from "@/context/ShouldRefreshContext";
import Notification from "@/utils/notifications";
import Calendar from "@/utils/calendar";
import { pl, registerTranslation } from "react-native-paper-dates";

registerTranslation("pl", pl);

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const { theme, contrast } = useAppSettings();

  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
  });

  const appTheme = useMemo(() => {
    if (theme === "light") {
      if (contrast === "normal") {
        return Themes.lightTheme;
      } else {
        return Themes.lightHighContrastTheme;
      }
    } else {
      if (contrast === "normal") {
        return Themes.darkTheme;
      } else {
        return Themes.darkHighContrastTheme;
      }
    }
  }, [theme, contrast]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const styles = makeStyles(appTheme);

  return (
    <View style={styles.appContainer}>
      <ThemeProvider theme={appTheme}>
        <NavigationDataProvider>
          <SnackbarProvider>
            <NotificationDataProvider>
              <TripImageContextProvider>
                <ShouldRefreshProvider>
                  <Portal.Host>
                    <View style={styles.container}>
                      <Slot />
                    </View>
                  </Portal.Host>
                </ShouldRefreshProvider>
              </TripImageContextProvider>
            </NotificationDataProvider>
          </SnackbarProvider>
        </NavigationDataProvider>
      </ThemeProvider>
    </View>
  );
}

export default () => {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
      <Notification />
      <Calendar />
    </AppSettingsProvider>
  );
};

const makeStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    statusBar: {
      backgroundColor: theme.colors.surface,
    },
  });
