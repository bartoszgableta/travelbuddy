import { Dimensions, StyleSheet, View } from "react-native";
import React, { useMemo, useState } from "react";
import { MD3Theme, TextInput, useTheme, Text } from "react-native-paper";
import {
  formatMoneyToString,
  formatMoneyToNumber,
} from "@/utils/CurrencyUtils";

import ClickableInput from "./ClickableInput";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

interface CurrencyValueInputProps {
  budget: number | undefined;
  currency: string;
  handleBudgetChange: (value: number) => void;
  error?: boolean;
  currencyDisable?: boolean;
  label?: string;
  placeholder?: string;
}

const CurrencyValueInput = ({
  budget,
  currency,
  handleBudgetChange,
  error,
  currencyDisable = false,
  label = "Budżet",
  placeholder = "0.00",
}: CurrencyValueInputProps) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [displayBudget, setDisplayBudget] = useState(
    budget ? budget.toFixed(2) : "",
  );

  const handleChange = (value: string) => {
    setDisplayBudget(value);
  };

  const handleEndEditing = () => {
    if (displayBudget === "") {
      handleBudgetChange(0);
      setDisplayBudget("");
      return;
    }
    const numericValue = formatMoneyToNumber(displayBudget);
    handleBudgetChange(parseFloat(numericValue.toFixed(2)));
    setDisplayBudget(formatMoneyToString(numericValue));
  };

  const handleSelectCurrency = () => {
    router.navigate({ pathname: "/trips/add/currency", params: { currency } });
  };

  return (
    <View style={styles.row}>
      <TextInput
        mode="outlined"
        style={styles.budgetInput}
        label={label}
        value={displayBudget}
        placeholder={placeholder}
        onChangeText={handleChange}
        onEndEditing={handleEndEditing}
        keyboardType="decimal-pad"
        error={error ?? false}
      />

      {
        <ClickableInput
          label="Waluta"
          value={currency}
          onPress={handleSelectCurrency}
          touchableStyle={styles.currencyTouchable}
          inputStyle={styles.currencyInput}
          left={undefined}
          disabled={currencyDisable}
        />
      }
    </View>
  );
};

export default CurrencyValueInput;

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    budgetInput: {
      flex: 0.65,
      backgroundColor: theme.colors.surface,
    },
    currencyTouchable: {
      flex: 0.3,
    },
    currencyInput: {
      backgroundColor: theme.colors.surface,
    },
    currencyLabel: {
      flex: 0.3,
      marginRight: 0.05 * width,
      textAlign: "center",
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 4,
      color: theme.colors.onSurface,
    },
  });
