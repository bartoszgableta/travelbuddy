import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ClickableInput from "./ClickableInput";
import { formatTime } from "@/utils/TimeUtils";
import { CLOCK_ICON } from "@/constants/Icons";

interface TimePickerProps {
  date: Date;
  showPicker: boolean;
  setShowPicker: (val: boolean) => void;
  onDateChange: (date: Date) => void;
  label?: string;
  error?: boolean;
}

const { width } = Dimensions.get("window");

const TimePicker: React.FC<TimePickerProps> = ({
  date,
  showPicker,
  setShowPicker,
  onDateChange,
  label,
  error,
}) => {
  const [timeString, setTimeString] = useState<string>(formatTime(date));

  const onChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    const currentTime = selectedTime || date;
    setShowPicker(false);
    onDateChange(currentTime);
    setTimeString(formatTime(currentTime));
  };

  return (
    <View style={styles.container}>
      <ClickableInput
        icon={CLOCK_ICON}
        value={timeString}
        label={label || "Godzina"}
        onPress={() => setShowPicker(true)}
        touchableStyle={styles.touchable}
        inputStyle={styles.input}
        error={error || false}
      />

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={onChange}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  timeText: {
    fontSize: 18,
    marginVertical: 10,
  },
  touchable: {
    width: width,
    alignItems: "center",
  },
  input: {
    width: "90%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerContainer: {
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default TimePicker;
