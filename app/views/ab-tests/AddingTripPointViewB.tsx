/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, Dimensions, ScrollView } from "react-native";
import {
  useTheme,
  Text,
  Button,
  TextInput,
  Searchbar,
  ActivityIndicator,
  List,
  Divider,
  Chip,
  SegmentedButtons,
  IconButton,
  Surface,
  Icon,
  TouchableRipple,
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
import { Place, PlaceViewModel, PlaceCompact } from "@/types/Place";
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

type SectionId = "place" | "basic" | "address" | "cost" | "notes";

const AddingTripPointViewB = () => {
  const theme = useTheme();
  const styles = createStyles(theme as MD3ThemeExtended);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { api } = useAuth();
  const { addRefreshScreen } = useShouldRefresh();

  const { trip_id, day_id, attractionProviderId, date } =
    useLocalSearchParams();

  // --- Data Fetching ---
  const { tripDetails } = useTripDetails(trip_id as string);
  const { items: categories } = useGetCategories();

  // --- Accordion State ---
  const [expandedSections, setExpandedSections] = useState<SectionId[]>([
    "place",
  ]);

  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [places, setPlaces] = useState<PlaceViewModel[]>([]);
  const [recommendations, setRecommendations] = useState<PlaceViewModel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  type PlaceEntryMode = "selection" | "search" | "recommendations";
  const [placeEntryMode, setPlaceEntryMode] =
    useState<PlaceEntryMode>("selection");

  // --- Form State ---
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    (attractionProviderId as string) || null,
  );
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>("");

  const { placeDetails: fetchedPlaceDetails, loading: placeLoading } =
    usePlaceDetails(
      selectedPlaceId || undefined,
      selectedPlaceId ? ATTRACTION_DETAILS_ENDPOINT : PLACE_DETAILS_ENDPOINT,
    );

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

  useEffect(() => {
    if (attractionProviderId) {
      setSelectedPlaceId(attractionProviderId as string);
      router.setParams({ attractionProviderId: undefined });
    }
  }, [attractionProviderId]);

  // --- Section Completion Status ---
  const isSectionComplete = useMemo(() => {
    return {
      place: !!selectedPlaceId || !!tripPointName.trim(),
      basic: !!tripPointName.trim() && !timeError,
      address: true, // Address is optional, always "complete"
      cost: true, // Cost is optional, always "complete"
      notes: true, // Notes are optional, always "complete"
    };
  }, [selectedPlaceId, tripPointName, timeError]);

  const canSubmit = useMemo(() => {
    return tripPointName.trim().length > 0 && !timeError;
  }, [tripPointName, timeError]);

  // --- Effects ---

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

  useEffect(() => {
    if (fetchedPlaceDetails) {
      setTripPointName(fetchedPlaceDetails.name);
      setSelectedPlaceName(fetchedPlaceDetails.name);

      const category = getCategoryByName(
        fetchedPlaceDetails.superCategory?.name ??
          findAttractionCategory(fetchedPlaceDetails),
      );
      setTripPointCategory(
        category || getCategoryByName(DEFAULT_CATEGORY_NAME),
      );

      // Populate address fields from fetched place details
      setCountry(fetchedPlaceDetails.country || "");
      setState(fetchedPlaceDetails.state || "");
      setCity(fetchedPlaceDetails.city || "");
      setStreet(fetchedPlaceDetails.street || "");
      setHouseNumber(fetchedPlaceDetails.houseNumber || "");

      // Auto-expand basic section after place is selected
      if (!expandedSections.includes("basic")) {
        setExpandedSections((prev) => [...prev, "basic"]);
      }
      setPlaceEntryMode("selection");
    }
  }, [fetchedPlaceDetails]);

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

  const toggleSection = (sectionId: SectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
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

  const handleManualEntry = (name?: string) => {
    setSelectedPlaceId(null);
    setSelectedPlaceName("");
    setTripPointName(name || "");
    // Default category if not set
    if (!tripPointCategory) {
      setTripPointCategory(getCategoryByName(DEFAULT_CATEGORY_NAME));
    }

    // Move to next section
    setPlaceEntryMode("selection");
    setExpandedSections((prev) => {
      const withoutPlace = prev.filter((id) => id !== "place");
      if (!withoutPlace.includes("basic")) {
        return [...withoutPlace, "basic"];
      }
      return withoutPlace;
    });
  };

  const handlePlaceSelect = (place: PlaceViewModel) => {
    setSelectedPlaceId(place.providerId);
    setSelectedPlaceName(place.title || "");
    // Clear query
    setSearchQuery("");
    setPlaceEntryMode("selection");
  };

  const handleDetailsPress = (place: PlaceViewModel) => {
    router.push({
      // @ts-ignore
      pathname: `/trips/place/${place.providerId}`,
      params: { trip_id, day_id, date },
    });
  };

  const handleClearPlace = () => {
    setSelectedPlaceId(null);
    setSelectedPlaceName("");
    setTripPointName("");
    setTripPointCategory(getCategoryByName(DEFAULT_CATEGORY_NAME));
    // Clear address fields
    setCountry("");
    setState("");
    setCity("");
    setStreet("");
    setHouseNumber("");
    setPlaceEntryMode("selection");
  };

  const handleSubmit = async () => {
    if (!tripPointName.trim()) {
      setNameError(true);
      showSnackbar("Nazwa punktu jest wymagana", "error");
      if (!expandedSections.includes("basic")) {
        setExpandedSections((prev) => [...prev, "basic"]);
      }
      return;
    }

    if (timeError) {
      showSnackbar(timeError, "error");
      if (!expandedSections.includes("basic")) {
        setExpandedSections((prev) => [...prev, "basic"]);
      }
      return;
    }

    setLoadingSubmit(true);
    try {
      const placeToRequest: Place = {
        name: tripPointName,
        providerId: selectedPlaceId || undefined,
        superCategoryId: tripPointCategory?.id,
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
        err.response?.data === OVERLAPPING_TRIP_POINTS_MESSAGE
          ? NEW_OVERLAPPING_ERROR_MESSAGE
          : "Wystąpił błąd podczas zapisywania.";
      showSnackbar(msg, "error");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleStartTimeChange = (date: Date) => {
    setStartTime(date);
    if (date.getTime() > endTime.getTime()) {
      setEndTime(date);
    }
  };

  const renderSectionIcon = (sectionId: SectionId, defaultIcon: string) => {
    return <List.Icon icon={defaultIcon} />;
  };

  const renderPlaceSection = () => {
    if (selectedPlaceId) {
      return (
        <Surface style={styles.selectedPlaceCard} elevation={1}>
          <View style={styles.selectedPlaceContent}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium">{selectedPlaceName}</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Wybrana atrakcja
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={handleClearPlace} />
          </View>
        </Surface>
      );
    }

    if (placeEntryMode === "search") {
      return (
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Szukaj lub wpisz nazwę..."
            onChangeText={onSearchQueryChange}
            value={searchQuery}
            style={styles.searchBar}
            loading={isSearching}
            icon="arrow-left"
            onIconPress={() => setPlaceEntryMode("selection")}
            autoFocus
          />

          <ScrollView
            style={styles.placeListContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {searchQuery.length > 0 && (
              <>
                <List.Item
                  title={`Użyj nazwy "${searchQuery}"`}
                  description="Wpisz dane ręcznie"
                  left={(props) => <List.Icon {...props} icon="pencil" />}
                  onPress={() => handleManualEntry(searchQuery)}
                  style={styles.manualEntryItem}
                />
                <Divider style={{ marginBottom: 8 }} />
              </>
            )}

            {isSearching ? (
              <ActivityIndicator style={{ margin: 20 }} />
            ) : places.length > 0 ? (
              places.map((item) => (
                <View key={item.providerId} style={{ marginBottom: 8 }}>
                  <PlaceCard
                    place={item}
                    handleAddPress={() => handlePlaceSelect(item)}
                    handleDetailsPress={() => handleDetailsPress(item)}
                  />
                </View>
              ))
            ) : (
              searchQuery.length > 2 && (
                <Text style={{ textAlign: "center", marginTop: 10 }}>
                  Brak wyników wyszukiwania
                </Text>
              )
            )}
          </ScrollView>
        </View>
      );
    }

    if (placeEntryMode === "recommendations") {
      return (
        <View style={styles.searchContainer}>
          <View style={styles.subHeaderContainer}>
            <IconButton
              icon="arrow-left"
              onPress={() => setPlaceEntryMode("selection")}
            />
            <Text style={styles.listHeader}>Polecane dla Ciebie</Text>
          </View>

          <ScrollView
            style={styles.placeListContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {isLoadingRecommendations ? (
              <ActivityIndicator style={{ margin: 20 }} />
            ) : recommendations.length > 0 ? (
              recommendations.map((item) => (
                <View key={item.providerId} style={{ marginBottom: 8 }}>
                  <PlaceCard
                    place={item}
                    handleAddPress={() => handlePlaceSelect(item)}
                    handleDetailsPress={() => handleDetailsPress(item)}
                  />
                </View>
              ))
            ) : (
              <Text
                style={{
                  textAlign: "center",
                  color: theme.colors.outline,
                  margin: 10,
                }}
              >
                Brak rekomendacji
              </Text>
            )}
          </ScrollView>
        </View>
      );
    }

    // Default: 'selection'
    return (
      <View style={styles.selectionContainer}>
        <Surface style={styles.selectionCardWrapper} elevation={1}>
          <TouchableRipple
            onPress={() => setPlaceEntryMode("search")}
            style={styles.selectionCardRipple}
          >
            <View style={styles.selectionCardContent}>
              <Icon source="magnify" size={24} />
              <View style={styles.selectionTextContainer}>
                <Text variant="titleMedium">Wyszukaj atrakcję</Text>
                <Text variant="bodySmall" style={styles.selectionDescription}>
                  Znajdź miejsce, które chcesz odwiedzić
                </Text>
              </View>
              <Icon source="chevron-right" size={24} />
            </View>
          </TouchableRipple>
        </Surface>

        <Surface style={styles.selectionCardWrapper} elevation={1}>
          <TouchableRipple
            onPress={() => setPlaceEntryMode("recommendations")}
            style={styles.selectionCardRipple}
          >
            <View style={styles.selectionCardContent}>
              <Icon source="star-outline" size={24} />
              <View style={styles.selectionTextContainer}>
                <Text variant="titleMedium">Wybierz z polecanych</Text>
                <Text variant="bodySmall" style={styles.selectionDescription}>
                  Sprawdź co warto zobaczyć w okolicy
                </Text>
              </View>
              <Icon source="chevron-right" size={24} />
            </View>
          </TouchableRipple>
        </Surface>

        <Surface style={styles.selectionCardWrapper} elevation={1}>
          <TouchableRipple
            onPress={() => handleManualEntry()}
            style={styles.selectionCardRipple}
          >
            <View style={styles.selectionCardContent}>
              <Icon source="pencil-outline" size={24} />
              <View style={styles.selectionTextContainer}>
                <Text variant="titleMedium">Wpisz ręcznie</Text>
                <Text variant="bodySmall" style={styles.selectionDescription}>
                  Samodzielnie uzupełnij wszystkie dane
                </Text>
              </View>
              <Icon source="chevron-right" size={24} />
            </View>
          </TouchableRipple>
        </Surface>
      </View>
    );
  };

  const renderBasicSection = () => {
    return (
      <View style={styles.sectionContent}>
        <TextInput
          label="Nazwa punktu*"
          value={tripPointName}
          onChangeText={(text) => {
            setTripPointName(text);
            setNameError(text.trim().length === 0);
          }}
          mode="outlined"
          error={nameError}
          style={styles.input}
        />
        {nameError && (
          <Text style={styles.textError}>Nazwa punktu jest wymagana</Text>
        )}

        <TripPointTypePicker
          selectedCategory={tripPointCategory}
          onPress={() => setIsCategorySheetVisible(true)}
        />

        <View style={styles.timeRow}>
          <View style={styles.timePickerContainer}>
            <TimePicker
              date={startTime}
              showPicker={isStartTimePickerVisible}
              setShowPicker={setIsStartTimePickerVisible}
              onDateChange={handleStartTimeChange}
              label="Od"
              style={{ width: "100%" }}
              inputStyle={{ width: "100%" }}
              error={!!timeError}
            />
          </View>
          <View style={styles.timePickerContainer}>
            <TimePicker
              date={endTime}
              showPicker={isEndTimePickerVisible}
              setShowPicker={setIsEndTimePickerVisible}
              onDateChange={setEndTime}
              label="Do"
              style={{ width: "100%" }}
              inputStyle={{ width: "100%" }}
              error={!!timeError}
            />
          </View>
        </View>
        {timeError && <Text style={styles.textError}>{timeError}</Text>}
      </View>
    );
  };

  const renderAddressSection = () => (
    <View style={styles.sectionContent}>
      {selectedPlaceId && (
        <Text variant="bodySmall" style={styles.addressNote}>
          Pola wypełnione automatycznie na podstawie wybranej atrakcji
        </Text>
      )}
      <TextInput
        label="Kraj"
        value={country}
        onChangeText={setCountry}
        mode="outlined"
        style={styles.input}
        disabled={!!selectedPlaceId}
      />
      <TextInput
        label="Województwo/Region"
        value={state}
        onChangeText={setState}
        mode="outlined"
        style={styles.input}
        disabled={!!selectedPlaceId}
      />
      <TextInput
        label="Miasto"
        value={city}
        onChangeText={setCity}
        mode="outlined"
        style={styles.input}
        disabled={!!selectedPlaceId}
      />
      <View style={styles.addressRow}>
        <TextInput
          label="Ulica"
          value={street}
          onChangeText={setStreet}
          mode="outlined"
          style={[styles.input, styles.streetInput]}
          disabled={!!selectedPlaceId}
        />
        <TextInput
          label="Numer domu"
          value={houseNumber}
          onChangeText={setHouseNumber}
          mode="outlined"
          style={[styles.input, styles.houseNumberInput]}
          disabled={!!selectedPlaceId}
        />
      </View>
    </View>
  );

  const renderCostSection = () => (
    <View style={styles.sectionContent}>
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
          { value: "perPerson", label: "Na osobę" },
          { value: "total", label: "Łącznie" },
        ]}
      />
    </View>
  );

  const renderNotesSection = () => (
    <View style={styles.sectionContent}>
      <TextInput
        label="Notatka (opcjonalne)"
        value={comment}
        onChangeText={setComment}
        numberOfLines={4}
        contentStyle={{ height: 100 }}
        multiline={true}
        mode="outlined"
        style={styles.input}
      />
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.view}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with date chip */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Nowy punkt wycieczki
          </Text>
          <Chip icon="calendar" style={styles.dateChip}>
            {date as string}
          </Chip>
        </View>

        <List.Section>
          {/* Place Section */}
          <List.Accordion
            title="Atrakcja"
            description={selectedPlaceName || "Wybierz lub pomiń"}
            left={(props) => renderSectionIcon("place", "map-marker")}
            expanded={expandedSections.includes("place")}
            onPress={() => toggleSection("place")}
            style={styles.accordion}
          >
            <View style={styles.accordionContent}>{renderPlaceSection()}</View>
          </List.Accordion>
          <Divider />

          {/* Basic Info Section */}
          <List.Accordion
            title="Podstawowe informacje"
            description={tripPointName || "Nazwa, kategoria, czas"}
            left={(props) => renderSectionIcon("basic", "information")}
            expanded={expandedSections.includes("basic")}
            onPress={() => toggleSection("basic")}
            style={styles.accordion}
          >
            <View style={styles.accordionContent}>{renderBasicSection()}</View>
          </List.Accordion>
          <Divider />

          {/* Address Section */}
          <List.Accordion
            title="Adres"
            description={
              city || street
                ? [[street, houseNumber].filter(Boolean).join(" "), city]
                    .filter(Boolean)
                    .join(", ")
                : "Opcjonalne"
            }
            left={(props) => renderSectionIcon("address", "home-map-marker")}
            expanded={expandedSections.includes("address")}
            onPress={() => toggleSection("address")}
            style={styles.accordion}
          >
            <View style={styles.accordionContent}>
              {renderAddressSection()}
            </View>
          </List.Accordion>
          <Divider />

          {/* Cost Section */}
          <List.Accordion
            title="Koszty"
            description={
              expectedCost > 0
                ? `${expectedCost} ${tripDetails?.currencyCode || "EUR"}`
                : "Opcjonalne"
            }
            left={(props) => renderSectionIcon("cost", "cash")}
            expanded={expandedSections.includes("cost")}
            onPress={() => toggleSection("cost")}
            style={styles.accordion}
          >
            <View style={styles.accordionContent}>{renderCostSection()}</View>
          </List.Accordion>
          <Divider />

          {/* Notes Section */}
          <List.Accordion
            title="Notatki"
            description={comment ? "Dodano notatkę" : "Opcjonalne"}
            left={(props) => renderSectionIcon("notes", "note-text")}
            expanded={expandedSections.includes("notes")}
            onPress={() => toggleSection("notes")}
            style={styles.accordion}
          >
            <View style={styles.accordionContent}>{renderNotesSection()}</View>
          </List.Accordion>
        </List.Section>
      </ScrollView>

      {/* Bottom Action Bar */}
      <Surface style={styles.bottomBar} elevation={2}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          disabled={loadingSubmit}
          style={styles.bottomButton}
        >
          Anuluj
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loadingSubmit}
          disabled={loadingSubmit || !canSubmit}
          style={styles.bottomButton}
        >
          Zapisz
        </Button>
      </Surface>

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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    header: {
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontWeight: "bold",
      color: theme.colors.onSurface,
    },
    dateChip: {
      backgroundColor: theme.colors.secondaryContainer,
    },
    accordion: {
      backgroundColor: theme.colors.surface,
      paddingLeft: 8,
    },
    accordionContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      marginLeft: 8,
    },
    sectionContent: {
      gap: 8,
    },
    selectionContainer: {
      gap: 12,
      paddingVertical: 8,
    },
    selectionCardWrapper: {
      backgroundColor: theme.colors.elevation.level1,
      borderRadius: 12,
      overflow: "hidden",
    },
    selectionCardRipple: {
      padding: 12,
    },
    selectionCardContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    selectionTextContainer: {
      flex: 1,
      marginLeft: 16,
    },
    selectionDescription: {
      color: theme.colors.onSurfaceVariant,
    },
    subHeaderContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
    searchContainer: {
      gap: 8,
    },
    searchBar: {
      backgroundColor: theme.colors.elevation.level1,
    },
    placeListContainer: {
      maxHeight: 300,
      paddingBottom: 10,
    },
    listHeader: {
      fontWeight: "bold",
      marginVertical: 8,
      color: theme.colors.onSurfaceVariant,
    },
    placeButtonsContainer: {
      alignItems: "center",
      gap: 8,
    },
    placeButton: {
      width: "100%",
    },
    selectedPlaceCard: {
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.secondaryContainer,
    },
    selectedPlaceContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    timeRow: {
      flexDirection: "row",
      gap: 12,
    },
    timePickerContainer: {
      flex: 1,
    },
    segmentedButtons: {
      marginTop: 8,
    },
    bottomBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 16,
      gap: 12,
      backgroundColor: theme.colors.surface,
    },
    bottomButton: {
      flex: 1,
    },
    textError: {
      color: theme.colors.error,
      ...theme.fonts.bodySmall,
    },
    addressNote: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: 8,
      fontStyle: "italic",
    },
    addressRow: {
      flexDirection: "row",
      gap: 12,
    },
    streetInput: {
      flex: 3,
    },
    houseNumberInput: {
      flex: 1,
    },
    manualEntryItem: {
      paddingLeft: 0,
      backgroundColor: theme.colors.elevation.level1,
      borderRadius: 8,
      marginBottom: 8,
    },
  });

export default AddingTripPointViewB;
