import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Text, Divider, useTheme } from "react-native-paper";
import { MaterialIcons } from "@react-native-vector-icons/material-icons";

type Props = {
  onPress: () => void;
  label: string;
  icon: any;
};

const ActionMenuListItem: React.FC<Props> = ({ onPress, label, icon }) => {
  const theme = useTheme();

  const isDeleteAction = icon === "delete";
  const contentColor = isDeleteAction
    ? theme.colors.error
    : theme.colors.onSurface;

  return (
    <>
      <Divider />
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <MaterialIcons name={icon} size={20} color={contentColor} />
        <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    marginLeft: 10,
  },
  divider: {
    width: "100%",
    height: 1,
  },
});

export default ActionMenuListItem;
