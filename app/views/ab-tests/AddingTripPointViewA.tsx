/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  FlatList,
} from "react-native";
import {
  useTheme,
  Text,
  Button,
  TextInput,
  Searchbar,
  ActivityIndicator,
  ProgressBar,
  FAB,
  SegmentedButtons,
} from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MD3ThemeExtended } from "@/constants/Themes";
import { useAuth } from "@/app/ctx";
import { useSnackbar } from "@/context/SnackbarContext";
import { useTripDetails } from "@/composables/useTripDetails";
import { useGetCategories } from "@/composables/useCategoryCondition";
import { useShouldRefresh } from "@/context/ShouldRefreshContext";
import {
  API_TRIP_POINT,
  API_PLACES_AUTOCOMPLETE,
  PLACE_DETAILS_ENDPOINT,
  ATTRACTION_DETAILS_ENDPOINT,
} from "@/constants/Endpoints";
import {
  TripPointRequest,
  TripPointDetails,
  Category,
} from "@/types/TripDayData";
import {
  Place,
  PlaceViewModel,
  PlaceCompact,
  PlaceDetails,
} from "@/types/Place";
import {
  CATEGORY_NAME_LIST,
  CategoryLabelsForProfiles,
  DEFAULT_CATEGORY_NAME,
} from "@/types/Profile";
import {
  addHoursToTheSameDay,
  formatTime,
  roundToNearestQuarterHour,
} from "@/utils/TimeUtils";
import { findAttractionCategory } from "@/utils/CategoryUtils";
import {
  NEW_OVERLAPPING_ERROR_MESSAGE,
  OVERLAPPING_TRIP_POINTS_MESSAGE,
} from "@/constants/Messages";
import { PlaceCard } from "@/components/explore/PlaceCard";
import TimePicker from "@/components/TimePicker";
import CurrencyValueInput from "@/components/CurrencyValueInput";
import SettingsBottomSheet from "@/components/SettingsBottomSheet";
import { useDebouncedCallback } from "use-debounce";
import usePlaceDetails from "@/composables/usePlace";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TripPointTypePicker from "@/components/TripPointTypePicker";

const { width } = Dimensions.get("window");

const convertPlace = (place: PlaceCompact): PlaceViewModel => {
  const subtitle = [place.city, place.state, place.country]
    .filter(Boolean)
    .join(", ");

  return {
    id: place.id,
    providerId: place.providerId || "",
    title: place.name,
    subtitle: subtitle,
  };
};

const AddingTripPointViewA = () => {
  const theme = useTheme();
  const styles = createStyles(theme as MD3ThemeExtended);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { api } = useAuth();
  const { addRefreshScreen } = useShouldRefresh();

  const { trip_id, day_id, attractionProviderId, date } =
    useLocalSearchParams();

  // --- State for Wizard ---
  const [step, setStep] = useState<number>(0);
  const TOTAL_STEPS = 6;

  // --- Data Fetching ---
  const { tripDetails } = useTripDetails(trip_id as string);
  const { items: categories } = useGetCategories();

  // --- Step 0: Search/Recommend State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [places, setPlaces] = useState<PlaceViewModel[]>([]);
  const [recommendations, setRecommendations] = useState<PlaceViewModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  // --- Form State ---
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Fetch place details if selectedPlaceId is set (either from params or selection)
  const { placeDetails: fetchedPlaceDetails, loading: placeLoading } =
    usePlaceDetails(
      selectedPlaceId || undefined,
      selectedPlaceId ? ATTRACTION_DETAILS_ENDPOINT : PLACE_DETAILS_ENDPOINT,
    );

  useEffect(() => {
    if (attractionProviderId) {
      setSelectedPlaceId(attractionProviderId as string);
      setStep(1);
      router.setParams({ attractionProviderId: undefined });
    }
  }, [attractionProviderId]);

  const [tripPointName, setTripPointName] = useState<string>("");
  const [tripPointCategory, setTripPointCategory] = useState<
    Category | undefined
  >(undefined);
  const [startTime, setStartTime] = useState<Date>(roundToNearestQuarterHour());
  const [endTime, setEndTime] = useState<Date>(
    addHoursToTheSameDay(startTime, 1),
  );

  const [expectedCost, setExpectedCost] = useState<number>(0);
  const [costType, setCostType] = useState<string>("perPerson");
  const [comment, setComment] = useState<string>("");

  // --- Address State ---
  const [country, setCountry] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [houseNumber, setHouseNumber] = useState<string>("");

  const [isStartTimePickerVisible, setIsStartTimePickerVisible] =
    useState(false);
  const [isEndTimePickerVisible, setIsEndTimePickerVisible] = useState(false);
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);

  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [timeError, setTimeError] = useState<string>("");

  // --- Effects ---

  // Initialize categories
  useEffect(() => {
    setFilteredCategories(
      categories.filter((category: Category) =>
        CATEGORY_NAME_LIST.includes(category.name),
      ),
    );
    if (!tripPointCategory) {
      setTripPointCategory(getCategoryByName(DEFAULT_CATEGORY_NAME));
    }
  }, [categories]);

  // Fetch recommendations on mount
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!trip_id) return;
      setIsLoadingRecommendations(true);
      try {
        const response = await api!.get(`/trips/recommendations/${trip_id}`);
        const parsedData = response.data.map(convertPlace) as PlaceViewModel[];
        setRecommendations(parsedData);
      } catch (error) {
        console.log("Error fetching recommendations", error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    fetchRecommendations();
  }, [trip_id]);

  // Handle Place Details Loaded
  useEffect(() => {
    if (fetchedPlaceDetails) {
      setTripPointName(fetchedPlaceDetails.name);

      const category = getCategoryByName(
        fetchedPlaceDetails.superCategory?.name ??
          findAttractionCategory(fetchedPlaceDetails),
      );
      setTripPointCategory(
        category || getCategoryByName(DEFAULT_CATEGORY_NAME),
      );

      // Populate address fields
      setCountry(fetchedPlaceDetails.country || "");
      setState(fetchedPlaceDetails.state || "");
      setCity(fetchedPlaceDetails.city || "");
      setStreet(fetchedPlaceDetails.street || "");
      setHouseNumber(fetchedPlaceDetails.houseNumber || "");
    }
  }, [fetchedPlaceDetails]);

  // Validate time range
  useEffect(() => {
    if (startTime.getTime() > endTime.getTime()) {
      setTimeError("Godzina zakończenia jest przed godziną rozpoczęcia");
    } else {
      setTimeError("");
    }
  }, [startTime, endTime]);

  // --- Helpers ---

  const getCategoryByName = (categoryName: string): Category | undefined => {
    return filteredCategories.find(
      (category: Category) => category.name === categoryName,
    );
  };

  const handleSearch = async (query: string) => {
    if (query.length <= 2) {
      setPlaces([]);
      setIsSearching(false);
      return;
    }
    try {
      const response = await api!.get(API_PLACES_AUTOCOMPLETE, {
        params: { query },
      });
      const parsedData = response.data.map(convertPlace) as PlaceViewModel[];
      setPlaces(
        parsedData.filter(
          (place) =>
            place.title && place.subtitle && !place.providerId.includes("null"),
        ),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useDebouncedCallback(handleSearch, 500);

  const onSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setIsSearching(true);
      debouncedSearch(query);
    }
  };

  const handlePlaceSelect = (place: PlaceViewModel) => {
    setSelectedPlaceId(place.providerId);
    setStep(1);
  };

  const handleDetailsPress = (place: PlaceViewModel) => {
    router.push({
      // @ts-ignore
      pathname: `/trips/place/${place.providerId}`,
      params: {
        trip_id,
        day_id,
        date,
      },
    });
  };

  const handleSkipPlace = () => {
    setSelectedPlaceId(null);
    setTripPointName("");
    setTripPointCategory(getCategoryByName(DEFAULT_CATEGORY_NAME));
    // Clear address fields
    setCountry("");
    setState("");
    setCity("");
    setStreet("");
    setHouseNumber("");
    setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && !tripPointName.trim()) {
      setNameError(true);
      return;
    }
    if (step === 1 && timeError) {
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!tripPointName) {
      showSnackbar("Nazwa punktu jest wymagana", "error");
      return;
    }

    setLoadingSubmit(true);
    try {
      const placeToRequest: Place = {
        name: tripPointName,
        providerId: selectedPlaceId || undefined,
        superCategoryId: tripPointCategory?.id,
        // Use state values (either from API or user input)
        country: country || null,
        state: state || null,
        street: street || null,
        city: city || null,
        houseNumber: houseNumber || null,
        latitude: fetchedPlaceDetails?.latitude || null,
        longitude: fetchedPlaceDetails?.longitude || null,
      } as Place;

      let totalExpectedCost = expectedCost;
      if (costType === "perPerson" && tripDetails?.numberOfTravelers) {
        totalExpectedCost = tripDetails.numberOfTravelers * expectedCost;
      }

      const tripPointRequest: TripPointRequest = {
        name: tripPointName,
        comment: comment,
        tripDayId: day_id as string,
        place: placeToRequest,
        startTime: `${formatTime(startTime, true)}`,
        endTime: `${formatTime(endTime, true)}`,
        predictedCost: totalExpectedCost,
      };

      const response = await api!.post<TripPointDetails>(
        API_TRIP_POINT,
        tripPointRequest,
      );

      if (response) {
        showSnackbar("Punkt wycieczki zapisany!");
        addRefreshScreen("trip-day");
        router.dismissTo(`/trips/details/${trip_id}/day/${day_id}`);
      }
    } catch (err: any) {
      console.error("Error saving trip point", err);

      const msg =
        err.response.data === OVERLAPPING_TRIP_POINTS_MESSAGE
          ? NEW_OVERLAPPING_ERROR_MESSAGE
          : "Wystąpił błąd podczas zapisywania.";
      showSnackbar(msg, "error");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // --- Render Steps ---

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Wybierz atrakcję</Text>
      <Searchbar
        placeholder="Wyszukaj..."
        onChangeText={onSearchQueryChange}
        value={searchQuery}
        style={styles.searchBar}
      />

      {isSearching || (searchQuery.length <= 2 && isLoadingRecommendations) ? (
        <ActivityIndicator animating={true} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={searchQuery.length > 2 ? places : recommendations}
          keyExtractor={(item) => item.providerId}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {searchQuery.length > 2 ? "Wyniki wyszukiwania" : "Rekomendacje"}
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              {searchQuery.length > 2 ? "Brak wyników" : "Brak rekomendacji"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ marginBottom: 10 }}>
              <PlaceCard
                place={item}
                handleAddPress={() => handlePlaceSelect(item)}
                handleDetailsPress={() => handleDetailsPress(item)}
              />
            </View>
          )}
        />
      )}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Podstawowe informacje</Text>

      <TextInput
        label="Nazwa punktu*"
        value={tripPointName}
        onChangeText={(text) => {
          setTripPointName(text);
          console.log("changed");
          setNameError(text.trim().length === 0);
        }}
        mode="outlined"
        error={nameError}
      />
      {nameError ? (
        <Text style={styles.textError}>Nazwa punktu jest wymagana</Text>
      ) : (
        <Text style={styles.textError}> </Text>
      )}

      <TripPointTypePicker
        selectedCategory={tripPointCategory}
        onPress={() => setIsCategorySheetVisible(true)}
      />

      <TimePicker
        date={startTime}
        showPicker={isStartTimePickerVisible}
        setShowPicker={setIsStartTimePickerVisible}
        onDateChange={setStartTime}
        label="Godzina rozpoczęcia*"
        style={{ width: "100%" }}
        inputStyle={{ width: "100%" }}
        error={!!timeError}
      />

      <TimePicker
        date={endTime}
        showPicker={isEndTimePickerVisible}
        setShowPicker={setIsEndTimePickerVisible}
        onDateChange={setEndTime}
        label="Godzina zakończenia*"
        style={{ width: "100%" }}
        inputStyle={{ width: "100%" }}
        error={!!timeError}
      />
      {timeError && <Text style={styles.textError}>{timeError}</Text>}
    </ScrollView>
  );

  const renderStep2 = () => {
    const isPlaceSelected = !!selectedPlaceId;
    return (
      <ScrollView style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Adres</Text>
        {isPlaceSelected && (
          <Text style={styles.addressNote}>
            Pola wypełnione automatycznie na podstawie wybranej atrakcji
          </Text>
        )}

        <TextInput
          label="Kraj"
          value={country}
          onChangeText={setCountry}
          mode="outlined"
          style={styles.input}
          disabled={isPlaceSelected}
        />

        <TextInput
          label="Województwo/Region"
          value={state}
          onChangeText={setState}
          mode="outlined"
          style={styles.input}
          disabled={isPlaceSelected}
        />

        <TextInput
          label="Miasto"
          value={city}
          onChangeText={setCity}
          mode="outlined"
          style={styles.input}
          disabled={isPlaceSelected}
        />

        <TextInput
          label="Ulica"
          value={street}
          onChangeText={setStreet}
          mode="outlined"
          style={styles.input}
          disabled={isPlaceSelected}
        />

        <TextInput
          label="Numer domu"
          value={houseNumber}
          onChangeText={setHouseNumber}
          mode="outlined"
          style={styles.input}
          disabled={isPlaceSelected}
        />
      </ScrollView>
    );
  };

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Koszty</Text>

      <CurrencyValueInput
        budget={expectedCost}
        handleBudgetChange={setExpectedCost}
        currency={tripDetails?.currencyCode || "EUR"}
        label="Przewidywany koszt"
        placeholder="0,00"
        currencyDisable={true}
      />

      <SegmentedButtons
        value={costType}
        onValueChange={setCostType}
        style={styles.segmentedButtons}
        buttons={[
          {
            value: "perPerson",
            label: "Na osobę",
          },
          {
            value: "total",
            label: "Łącznie",
          },
        ]}
      />
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Notatki</Text>

      <TextInput
        label="Notatki (opcjonalne)"
        value={comment}
        onChangeText={setComment}
        numberOfLines={6}
        contentStyle={{ height: 150 }}
        multiline={true}
        mode="outlined"
      />
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Podsumowanie</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Nazwa:</Text>
        <Text style={styles.summaryValue}>{tripPointName}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Kategoria:</Text>
        <Text style={styles.summaryValue}>
          {CategoryLabelsForProfiles[tripPointCategory?.name ?? "tourism"]}
        </Text>
      </View>

      {(country || city) && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lokalizacja:</Text>
          <Text style={styles.summaryValue}>
            {[street, houseNumber, city, country].filter(Boolean).join(", ")}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Czas:</Text>
        <Text style={styles.summaryValue}>
          {formatTime(startTime)} - {formatTime(endTime)}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Koszt:</Text>
        <Text style={styles.summaryValue}>
          {expectedCost} {tripDetails?.currencyCode}
        </Text>
      </View>

      {comment ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Notatka:</Text>
          <Text style={styles.summaryValue}>{comment}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  return (
    <GestureHandlerRootView style={styles.view}>
      <ProgressBar
        progress={(step + 1) / TOTAL_STEPS}
        color={theme.colors.primary}
      />

      <View style={{ flex: 1, padding: 16 }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </View>

      <View style={styles.navigationButtons}>
        <Button mode="text" onPress={handleBack} disabled={loadingSubmit}>
          {step === 0 ? "Anuluj" : "Wstecz"}
        </Button>

        {step === 0 && (
          <Button mode="contained" onPress={handleSkipPlace}>
            Pomiń
          </Button>
        )}

        {step > 0 && step < TOTAL_STEPS - 1 && (
          <Button mode="contained" onPress={handleNext}>
            Dalej
          </Button>
        )}

        {step === TOTAL_STEPS - 1 && (
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loadingSubmit}
            disabled={loadingSubmit}
          >
            Zapisz
          </Button>
        )}
      </View>

      <SettingsBottomSheet
        title={"Wybierz kategorię"}
        items={CategoryLabelsForProfiles}
        selectedItem={tripPointCategory?.name || DEFAULT_CATEGORY_NAME}
        isVisible={isCategorySheetVisible}
        onSelect={(item: string) => {
          const cat = getCategoryByName(item);
          if (cat) setTripPointCategory(cat);
          setIsCategorySheetVisible(false);
        }}
        onClose={() => setIsCategorySheetVisible(false)}
      />
    </GestureHandlerRootView>
  );
};

const createStyles = (theme: MD3ThemeExtended) =>
  StyleSheet.create({
    view: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    stepContainer: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme.colors.onSurface,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginVertical: 10,
      color: theme.colors.onSurface,
    },
    searchBar: {
      marginBottom: 10,
      backgroundColor: theme.colors.elevation.level1,
    },
    navigationButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
    fab: {
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
    },
    segmentedButtons: {
      marginVertical: 15,
    },
    summaryRow: {
      marginBottom: 10,
    },
    summaryLabel: {
      fontWeight: "bold",
      color: theme.colors.onSurfaceVariant,
    },
    summaryValue: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    textError: {
      color: theme.colors.error,
      width: 0.85 * width,
      textAlign: "left",
      ...theme.fonts.bodySmall,
    },
    input: {
      marginBottom: 12,
      backgroundColor: theme.colors.surface,
    },
    addressNote: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 16,
      fontStyle: "italic",
      ...theme.fonts.bodySmall,
    },
  });

export default AddingTripPointViewA;
