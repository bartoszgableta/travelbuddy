// import TripDayView from "@/views/TripDayView";
//
// export default function TripDay() {
//   return <TripDayView />;
// }

import TripDayViewForScroll from "@/views/TripDayViewForScroll";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useState, useMemo, useRef, useEffect } from "react";
import { Text, useTheme } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { useTripDetails } from "@/composables/useTripDetails";
import { type TripDay } from "@/types/Trip";
import { MD3ThemeExtended } from "@/constants/Themes";

const { width } = Dimensions.get("window");

// Version A: Navbar with embedded TripDay
const TripDayNavbarWrapper = () => {
  const theme = useTheme();
  const styles = useMemo(
    () => createNavbarStyles(theme as MD3ThemeExtended),
    [theme],
  );
  const { trip_id, day_id } = useLocalSearchParams();
  console.log(day_id);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    Array.isArray(day_id) ? day_id[0] : day_id,
  );

  const { tripDetails } = useTripDetails(trip_id as string);

  const sortedDays = useMemo(() => {
    return [...(tripDetails?.tripDays || [])].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [tripDetails]);

  const handleDayPress = (dayId: string) => {
    setSelectedDayId(dayId);
    const index = sortedDays.findIndex((day) => day.id === dayId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (sortedDays.length > 0 && selectedDayId) {
      const index = sortedDays.findIndex((day) => day.id === selectedDayId);
      if (index !== -1) {
        // Wait a bit for layout to be ready
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5,
        });
        setTimeout(() => {}, 100);
      }
    }
  }, [sortedDays]);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <FlatList
          ref={flatListRef}
          data={sortedDays}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navbarContent}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 100));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
                viewPosition: 0.5,
              });
            });
          }}
          renderItem={({ item: day, index }) => (
            <TouchableOpacity
              style={[
                styles.dayTab,
                selectedDayId === day.id && styles.dayTabSelected,
              ]}
              onPress={() => handleDayPress(day.id)}
            >
              <Text
                style={[
                  styles.dayTabText,
                  selectedDayId === day.id && styles.dayTabTextSelected,
                ]}
              >
                Dzień {index + 1}
              </Text>
              <Text
                style={[
                  styles.dayTabDate,
                  selectedDayId === day.id && styles.dayTabDateSelected,
                ]}
              >
                {new Date(day.date).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {selectedDayId && (
        <TripDayViewForScroll
          trip_id={Array.isArray(trip_id) ? trip_id[0] : trip_id}
          day_id={selectedDayId}
        />
      )}
    </View>
  );
};

export default function TripDay() {
  return <TripDayNavbarWrapper />;
}

const createNavbarStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    navbar: {
      backgroundColor: theme.colors.elevation.level2,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    navbarContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    dayTab: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 20,
      minWidth: 100,
      alignItems: "center",
    },
    dayTabSelected: {
      backgroundColor: theme.colors.primary,
    },
    dayTabText: {
      fontSize: 16,
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    dayTabTextSelected: {
      color: theme.colors.onPrimary,
      fontWeight: "bold",
    },
    dayTabDate: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    dayTabDateSelected: {
      color: theme.colors.onPrimary,
    },
  });

const createScrollStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    dayContainer: {
      width: width,
      flex: 1,
    },
    dayHeader: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      alignItems: "center",
    },
    dayTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: 4,
    },
    dayDate: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    pagination: {
      position: "absolute",
      bottom: 80,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      pointerEvents: "none",
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.onSurfaceVariant,
      opacity: 0.3,
    },
    paginationDotActive: {
      backgroundColor: theme.colors.primary,
      opacity: 1,
      width: 24,
    },
  });
