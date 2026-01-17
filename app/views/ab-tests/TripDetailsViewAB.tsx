/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyleSheet, View, Image, Dimensions, ScrollView } from "react-native";
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import TripDetailLabel from "@/components/TripDetailLabel";
import { Button, List, Text, useTheme } from "react-native-paper";
import {
  CALENDAR_ICON,
  DELETE_ICON,
  EDIT_ICON_MATERIAL,
} from "@/constants/Icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import SingleDatePickerModal from "@/components/SingleDatePickerModal";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { useTripDetails } from "@/composables/useTripDetails";
import { TripDay, TripViewModel } from "@/types/Trip";
import { useSnackbar } from "@/context/SnackbarContext";
import { convertTripResponseToViewModel } from "@/converters/tripConverters";
import usePlaceDetails from "@/composables/usePlace";
// import LoadingView from "./LoadingView";
import { MD3ThemeExtended } from "@/constants/Themes";
import CustomModal from "@/components/CustomModal";
import ActionTextButtons from "@/components/ActionTextButtons";
import { useAuth } from "@/app/ctx";
import { formatDateToISO } from "@/utils/TimeUtils";
import { useGetProfile } from "@/composables/useProfiles";
import useTripImageStorage from "@/hooks/useTripImageStore";
import { DEFAULT_TRIP_IMAGE, TRIP_IMAGES } from "@/constants/Images";
import { conditionalItem } from "@/utils/ArrayUtils";
import { useShouldRefresh } from "@/context/ShouldRefreshContext";

const { height, width } = Dimensions.get("window");

const TripDetailsView = () => {
  const { api } = useAuth();
  const theme = useTheme();
  const styles = useMemo(
    () => createStyles(theme as MD3ThemeExtended),
    [theme],
  );
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tripViewModel, setTripViewModel] = useState<TripViewModel | undefined>(
    undefined,
  );

  const { refreshScreens, addRefreshScreen, removeRefreshScreen } =
    useShouldRefresh();

  const shouldRefresh = useMemo(
    () => refreshScreens.includes("trip-details"),
    [refreshScreens],
  );

  // Removal modal
  const [isModalVisible, setIsModalVisible] = useState(false);

  const hideModal = () => setIsModalVisible(false);

  const showRemovalModal = () => setIsModalVisible(true);

  const deleteTrip = async (tripId: string | undefined) => {
    if (!tripId) return;

    hideModal();
    try {
      await api!.delete(`/trips/${tripId}`);
      await removeImage(tripId);

      addRefreshScreen("trips");
      router.navigate("/trips");
      showSnackbar("Usunięto wycieczkę!");
    } catch (error: any) {
      showSnackbar("Wystąpił błąd podczas usuwania wycieczki", "error");
    }
  };
  const { trip_id, refresh } = useLocalSearchParams();
  const navigation = useNavigation();

  const {
    tripDetails,
    tripSummary,
    loading: tripLoading,
    error: tripError,
    refetch: tripRefetch,
  } = useTripDetails(trip_id as string);

  const {
    placeDetails: destinationDetails,
    loading: destinationLoading,
    error: destinationError,
    refetch: destinationRefetch,
  } = usePlaceDetails(tripDetails?.destinationId);

  const {
    profile: categoryProfile,
    error: categoryProfileError,
    refetch: refetchCategoryProfile,
  } = useGetProfile("Category", tripDetails?.categoryProfileId as string, {
    immediate: false,
  });
  const {
    profile: conditionProfile,
    error: conditionProfileError,
    refetch: refetchConditionProfile,
  } = useGetProfile("Condition", tripDetails?.conditionProfileId as string, {
    immediate: false,
  });

  const { getImageName, removeImage } = useTripImageStorage();
  const [resolvedImage, setResolvedImage] = useState(null);

  const resolvedImageSource = resolvedImage ?? DEFAULT_TRIP_IMAGE;

  useEffect(() => {
    const fetchImageName = async () => {
      const storedImageName = await getImageName(trip_id as string);
      if (storedImageName) {
        setResolvedImage(TRIP_IMAGES[storedImageName]);
      }
    };

    fetchImageName();
  }, [trip_id, getImageName]);

  useEffect(() => {
    const refetch = async () => {
      if (tripDetails) {
        if (tripDetails.categoryProfileId) await refetchCategoryProfile();
        if (tripDetails.conditionProfileId) await refetchConditionProfile();
      }
    };
    refetch();
  }, [tripDetails]);

  const loading = useMemo(() => {
    return tripLoading || destinationLoading || false;
  }, [tripLoading, destinationLoading]);

  const error = useMemo(() => {
    return (
      tripError ||
      destinationError ||
      categoryProfileError ||
      conditionProfileError ||
      null
    );
  }, [
    tripError,
    destinationError,
    categoryProfileError,
    conditionProfileError,
  ]);

  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    const refreshOnFocus = async () => {
      if (shouldRefresh) {
        await tripRefetch();
        await destinationRefetch();
        removeRefreshScreen("trip-details");
      }
    };
    refreshOnFocus();
  }, [shouldRefresh]);

  useEffect(() => {
    if (tripDetails && destinationDetails) {
      setTripViewModel(
        convertTripResponseToViewModel(
          tripDetails,
          tripSummary,
          destinationDetails,
          categoryProfile,
          conditionProfile,
        ),
      );
    }
  }, [
    tripDetails,
    tripSummary,
    destinationDetails,
    categoryProfile,
    conditionProfile,
  ]);

  const labels: Record<string, string> = {
    numberOfTripPoints: "Liczba punktów wycieczki",
    numberOfTravelers: "Liczba osób",
    predictedCost: "Przewidywany koszt wycieczki",
    actualCost: "Ogólny koszt wycieczki",
    budget: "Budżet wycieczki",
    categoryProfileName: "Profil preferencji",
    conditionProfileName: "Profil udogodnień",
  };

  const dateToIdMap = useMemo(() => {
    return new Map(
      tripDetails?.tripDays.map((day: TripDay) => [day.date, day.id]) || [],
    );
  }, [tripDetails]);

  const handlePress = () => {
    setDateModalVisible(true);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      actions: [
        {
          hasMenu: true,
          menuActions: [
            ...conditionalItem(
              new Date(tripDetails?.endDate ?? new Date()) >= new Date(),
              {
                title: "Edytuj",
                icon: EDIT_ICON_MATERIAL,
                color: theme.colors.onSurface,
                onPress: () => {
                  router.push(`/trips/edit/${trip_id}`);
                },
              },
            ),
            {
              title: "Usuń",
              icon: DELETE_ICON,
              color: theme.colors.error,
              onPress: () => {
                showRemovalModal();
              },
            },
          ],
        },
      ],
    });
  }, [navigation, tripDetails]);

  const handleDismiss = useCallback(() => {
    setDateModalVisible(false);
  }, [setDateModalVisible]);

  const handleConfirm = useCallback(
    ({ date }: { date: CalendarDate }) => {
      const fixedDate = date as Date;
      const formattedDate = formatDateToISO(fixedDate);
      const tripDayId = dateToIdMap.get(formattedDate);
      if (tripDayId) {
        console.log("Redirecting to day with id " + tripDayId);
        setDateModalVisible(false);
        router.push(`/trips/details/${trip_id}/day/${tripDayId}`);
      } else {
        console.error("Day not found");
      }
    },
    [setDateModalVisible, dateToIdMap],
  );

  // if (loading) {
  //   return <LoadingView transparent={false} />;
  // }

  if (error) {
    router.back();
    showSnackbar(error?.toString() || "Unknown error", "error");
    return null;
  }
  return (
    <>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image
            source={resolvedImageSource}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.headerInfoContainer}>
            <Text variant="headlineMedium" style={styles.tripName}>
              {tripViewModel?.name}
            </Text>
            <Text variant="titleMedium" style={styles.tripDestination}>
              {tripViewModel?.destination}
            </Text>
            <Text variant="bodyLarge" style={styles.tripDate}>
              {tripViewModel?.dateRange}
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              icon={CALENDAR_ICON}
              style={styles.planButton}
              contentStyle={styles.planButtonContent}
              labelStyle={styles.planButtonLabel}
              onPress={() => {
                const firstDay = tripDetails?.tripDays?.find(
                  (day) => day.date === tripDetails.startDate,
                );
                if (firstDay) {
                  router.push(`/trips/details/${trip_id}/day/${firstDay.id}`);
                }
              }}
            >
              Planuj dni
            </Button>
          </View>

          {tripDetails?.tripDays && tripDetails.tripDays.length > 0 && (
            <List.Section style={styles.daysList} title="Plan wycieczki">
              {tripDetails.tripDays
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((day, index) => (
                  <List.Item
                    key={day.id}
                    title={`Dzień ${index + 1}`}
                    description={day.date}
                    left={(props) => (
                      <List.Icon {...props} icon={CALENDAR_ICON} />
                    )}
                    onPress={() =>
                      router.push(`/trips/details/${trip_id}/day/${day.id}`)
                    }
                    right={(props) => (
                      <List.Icon {...props} icon="chevron-right" />
                    )}
                    style={styles.dayItem}
                  />
                ))}
            </List.Section>
          )}

          <List.Accordion
            title="Szczegóły i koszty"
            style={styles.detailsAccordion}
            titleStyle={styles.detailsAccordionTitle}
          >
            <View style={styles.detailsContainer}>
              {tripViewModel &&
                Object.entries(tripViewModel)
                  .filter(([key]) => key in labels)
                  .map(([key, value]) => (
                    <TripDetailLabel
                      key={key}
                      title={labels[key]}
                      value={value ? value.toString() : ""}
                    />
                  ))}
            </View>
          </List.Accordion>
        </ScrollView>

        {tripDetails && (
          <SingleDatePickerModal
            visible={dateModalVisible}
            startDate={tripDetails?.startDate}
            endDate={tripDetails?.endDate}
            onDismiss={handleDismiss}
            onConfirm={handleConfirm}
          />
        )}
      </View>
      <CustomModal visible={isModalVisible} onDismiss={hideModal}>
        <View>
          <Text style={styles.modalTitleText}>
            Czy na pewno chcesz usunąć tą wycieczkę?
          </Text>
          <View style={styles.modalContent}>
            <Text style={styles.boldText}>{tripViewModel?.name}</Text>
            <Text style={styles.modalSubtitle}>{tripViewModel?.dateRange}</Text>
          </View>
          <ActionTextButtons
            onAction1={hideModal}
            onAction2={() => deleteTrip(tripDetails?.id)}
            action1ButtonLabel="Anuluj"
            action2ButtonLabel="Usuń"
            action1Icon={undefined}
            action2Icon={undefined}
          />
        </View>
      </CustomModal>
    </>
  );
};

export default TripDetailsView;

const createStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    scrollContent: {
      alignItems: "center",
      paddingBottom: 25,
    },
    headerInfoContainer: {
      width: "100%",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    tripName: {
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 4,
    },
    tripDestination: {
      textAlign: "center",
      marginBottom: 4,
      color: theme.colors.outline,
    },
    tripDate: {
      textAlign: "center",
      color: theme.colors.outline,
    },
    detailsContainer: {
      width: "100%",
      paddingBottom: 16,
    },
    actionContainer: {
      width: "100%",
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    // ... planButton styles ...
    planButton: {
      width: "100%",
      borderRadius: 8,
    },
    planButtonContent: {
      height: 48,
    },
    planButtonLabel: {
      fontSize: 16,
      fontWeight: "bold",
    },
    daysList: {
      width: "100%",
    },
    dayItem: {
      backgroundColor: theme.colors.elevation.level1,
      marginBottom: 8,
      borderRadius: 8,
      marginHorizontal: 16,
    },
    detailsAccordion: {
      width: "100%",
      backgroundColor: theme.colors.surface,
    },
    detailsAccordionTitle: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    image: {
      marginBottom: 25,
      width: "100%",
      height: height * 0.25,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 16,
    },
    modalTitleText: {
      ...theme.fonts.titleLarge,
      color: theme.colors.onSurface,
    },
    modalContent: {
      marginVertical: 20,
    },
    boldText: {
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    modalSubtitle: {
      color: theme.colors.onSurface,
    },
  });
