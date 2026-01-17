import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import React, { useMemo } from "react";
import { MD3Theme, Text, useTheme } from "react-native-paper";

interface TripDetailLabelProps {
  title: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}

const TripDetailLabel = ({ title, value, style }: TripDetailLabelProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value ? value : "Brak"}</Text>
    </View>
  );
};

export default TripDetailLabel;

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    title: {
      ...theme.fonts.bodyMedium,
      marginBottom: 4,
    },
    value: {
      ...theme.fonts.titleMedium,
    },
  });
