/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyleSheet, View } from "react-native";
import { useTheme, Text } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MD3ThemeExtended } from "@/constants/Themes";
import { TransferPoint } from "@/types/TripDayData";

const AddingTripPointViewA = () => {
  const theme = useTheme();
  const styles = createStyles(theme as MD3ThemeExtended);

  return (
    <View style={styles.view}>
      <Text style={styles.text}>Here should be AddingTripPointView</Text>
    </View>
  );
};

const createStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    view: {
      flex: 1,
    },
    text: {
      color: theme.colors.onSurface,
    },
  });

export default AddingTripPointViewA;
