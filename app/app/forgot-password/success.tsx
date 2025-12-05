import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useTheme, Text, Button } from "react-native-paper";
import { MD3ThemeExtended } from "@/constants/Themes";

export default function Success() {
  const theme = useTheme() as MD3ThemeExtended;

  const styles = makeStyles(theme);

  const handlePress = () => {
    router.dismissTo("/sign-in");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.innerContainer}>
        <Text style={styles.headline} variant="headlineLarge">
          Udało się!
        </Text>
        <Text variant="bodyLarge" style={styles.paragraph}>
          Zmieniono hasło.
        </Text>
        <Button
          style={styles.button}
          labelStyle={styles.buttonLabel}
          mode="contained"
          onPress={handlePress}
          contentStyle={styles.buttonContent}
        >
          Wróć do logowania
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );
}

const makeStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    innerContainer: {
      flex: 1,
      justifyContent: "flex-end",
    },
    headline: {
      fontFamily: "Manrope_700Bold",
      marginHorizontal: 40,
      marginBottom: 20,
    },
    paragraph: {
      marginHorizontal: 40,
      marginBottom: 140,
    },
    button: {
      alignSelf: "stretch",
      marginHorizontal: 40,
      marginBottom: 84,
      marginTop: 20,
    },
    buttonLabel: {
      fontSize: 16,
    },
    buttonContent: {
      paddingVertical: 0,
    },
  });
