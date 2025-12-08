// import TripDayView from "@/views/TripDayView";
//
// export default function TripDay() {
//   return <TripDayView />;
// }

import TripDayView from "@/views/TripDayView";
import useAppSettings from "@/hooks/useAppSettings";
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import React, { useState, useMemo, useEffect } from "react";
import { Text, useTheme } from "react-native-paper";
import { router, useLocalSearchParams } from "expo-router";
import { useTripDetails } from "@/composables/useTripDetails";
import { type TripDay } from "@/types/Trip";
import { MD3ThemeExtended } from "@/constants/Themes";

const { width } = Dimensions.get("window");

// Version A: Navbar with embedded TripDay
const TripDayNavbarWrapper = () => {
  const theme = useTheme();
  const styles = useMemo(() => createNavbarStyles(theme as MD3ThemeExtended), [theme]);
  const { trip_id, day_id } = useLocalSearchParams();

  const { tripDetails } = useTripDetails(trip_id as string);

  const sortedDays = useMemo(() => {
    return [...(tripDetails?.tripDays || [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [tripDetails]);

  const handleDayPress = (dayId: string) => {
    router.push(`/trips/details/${trip_id}/day/${dayId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navbarContent}
        >
          {sortedDays.map((day: TripDay, index: number) => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayTab,
                day_id === day.id && styles.dayTabSelected
              ]}
              onPress={() => handleDayPress(day.id)}
            >
              <Text style={[
                styles.dayTabText,
                day_id === day.id && styles.dayTabTextSelected
              ]}>
                Dzień {index + 1}
              </Text>
              <Text style={[
                styles.dayTabDate,
                day_id === day.id && styles.dayTabDateSelected
              ]}>
                {new Date(day.date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'short'
                })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TripDayView />
    </View>
  );
};

// Version B: Horizontal scroll with embedded TripDay
const TripDayScrollWrapper = () => {
  const theme = useTheme();
  const styles = useMemo(() => createScrollStyles(theme as MD3ThemeExtended), [theme]);
  const { trip_id, day_id } = useLocalSearchParams();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { tripDetails } = useTripDetails(trip_id as string);

  const sortedDays = useMemo(() => {
    return [...(tripDetails?.tripDays || [])].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [tripDetails]);

  const currentIndex = useMemo(() => {
    return sortedDays.findIndex(day => day.id === day_id);
  }, [sortedDays, day_id]);

  // Scroll to current day on mount
  useEffect(() => {
    if (currentIndex >= 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: currentIndex * width, animated: false });
    }
  }, [currentIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < sortedDays.length) {
      const newDay = sortedDays[index];
      router.replace(`/trips/details/${trip_id}/day/${newDay.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {sortedDays.map((day: TripDay, index: number) => (
          <View key={day.id} style={styles.dayContainer}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Dzień {index + 1}</Text>
              <Text style={styles.dayDate}>
                {new Date(day.date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long'
                })}
              </Text>
            </View>
            {day.id === day_id && <TripDayView />}
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {sortedDays.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export default function TripDay() {
  const { uxVariant } = useAppSettings();

  if (uxVariant === "a") {
    return <TripDayNavbarWrapper />;
  }

  if (uxVariant === "b") {
    return <TripDayScrollWrapper />;
  }

  return <TripDayView />;
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
      alignItems: 'center',
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
      fontWeight: 'bold',
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
      backgroundColor: theme.colors.background,
    },
    dayContainer: {
      width: width,
      flex: 1,
    },
    dayHeader: {
      padding: 16,
      backgroundColor: theme.colors.elevation.level2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
      alignItems: 'center',
    },
    dayTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    dayDate: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    pagination: {
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
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