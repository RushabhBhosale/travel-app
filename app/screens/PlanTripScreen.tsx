import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { HomeStackParams } from "../navigation/HomeStack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useAuth, useUser } from "@clerk/clerk-expo";
import Modal from "react-native-modal";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import axios from "axios";

const PlanTripScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HomeStackParams, "PlanTrip">>();
  const { trip: initialTrip } = route.params;
  const { user } = useUser();
  const [trip, setTrip] = useState(initialTrip);
  const [showNotes, setShowNotes] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<
    "place" | "expense" | "editExpense" | "ai"
  >("place");
  const [activePlace, setActivePlace] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState<any>("");
  const { getToken } = useAuth();
  const categories = [
    "Flight",
    "Lodging",
    "Shopping",
    "Activities",
    "Sightseeing",
    "Drinks",
    "Food",
    "Transportation",
    "Entertainment",
    "Miscellaneous",
  ];
  const splitOptions = [
    { label: "Don't Split", value: "Don't Split" },
    { label: "Everyone", value: "Everyone" },
  ];
  const GOOGLE_API_KEY = "AIzaSyCOwvl1GwLyTUyJgaBAk8RHCN64bQQBsGk";

  const getAverageRating = (reviews: any[]) => {
    if (!reviews || reviews.length == 0) return 0;
    const total = reviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0
    );

    return (total / reviews.length).toFixed(1);
  };

  const renderStars = (rating: number) => {
    const stars: any = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons name="star" size={14} color={"#FFD700"} />);
      } else if (i === fullStars && halfStar) {
        stars.push(<Ionicons name="star-half" size={14} color={"#FFD700"} />);
      } else {
        stars.push(
          <Ionicons name="star-outline" size={14} color={"#FFD700"} />
        );
      }
    }

    return stars;
  };

  const getCurrentDayHours = (openingHours: any[]) => {
    if (!openingHours || openingHours.length === 0)
      return "Opening hours unavailable";

    const today = dayjs().format("dddd").toLowerCase();
    const todayHours = openingHours.find((line) =>
      line.toLowerCase().startsWith(today)
    );
    return todayHours || openingHours[0];
  };

  const renderPlaceTypes = (types: any[]) => {
    return types.map((type, idx) => (
      <View key={idx} className="bg-gray-100 px-3 py-1 rounded-full mr-1 mb-1">
        <Text className="text-xs font-medium text-gray-700 capitalize">
          {type}
        </Text>
      </View>
    ));
  };

  const renderPlaceCard = (place: any, index: number) => {
    console.log("j", place);
    const isActice = activePlace?.name == place?.name;
    return (
      <View
        key={index}
        className="mb-4 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
      >
        <TouchableOpacity
          onPress={() => setActivePlace(isActice ? null : place)}
          className="flex-row items-center"
        >
          <Image
            className="size-24 rounded-l-xl"
            source={{ uri: place?.photos[0] }}
          />
          <View className="flex-1 p-3">
            <Text className="text-base text-gray-600 font-bold mb-1">
              {place.name}
            </Text>
            <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
              {place.briefDescription || "No Description"}
            </Text>
            <View className="flex-row items-center mt-1">
              {renderStars(getAverageRating(place.reviews))}
              <Text className="text-xs text-gray-500 ml-1">
                ({getAverageRating(place.reviews)} / 5)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isActice && (
          <View className="p-4 bg-gray-50 border-t border-gray-200">
            <View className="mb-4">
              <View className="flex-row items-center">
                <Ionicons name="location" size={15} color={"#4B5563"} />
                <Text className="text-sm text-gray-700 font-semibold ml-1">
                  Address
                </Text>
              </View>
              <Text className="text-sm text-gray-600 mt-1">
                {place.formatted_address}
              </Text>
            </View>

            {place?.openingHours.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={15} color={"#4B5563"} />
                  <Text className="text-sm text-gray-700 font-semibold ml-1">
                    Opening Hours
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {getCurrentDayHours(place.openingHours)}
                </Text>
              </View>
            )}

            {place?.phoneNumber && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="call" size={15} color={"#4B5563"} />
                  <Text className="text-sm text-gray-700 font-semibold ml-1">
                    Phone
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {place.phoneNumber}
                </Text>
              </View>
            )}

            {place?.website && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="globe" size={15} color={"#4B5563"} />
                  <Text className="text-sm text-gray-700 font-semibold ml-1">
                    Website
                  </Text>
                </View>
                <Text
                  className="text-sm text-blue-500 underline mt-1"
                  numberOfLines={2}
                >
                  {place.website}
                </Text>
              </View>
            )}

            {place?.reviews.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={15} color={"#4B5563"} />
                  <Text className="text-sm text-gray-700 font-semibold ml-1">
                    Reviews
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  {renderStars(place.reviews[0].rating)}
                  <Text className="text-xs text-gray-500 ml-1">
                    {" "}
                    - {place.reviews[0].authorName} ({place.reviews[0].rating} /
                    5)
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 italic mt-1">
                  "{place.reviews[0].text.slice(0, 100)}" "
                  {place.reviews[0].text.length > 100 ? "..." : ""}"
                </Text>
              </View>
            )}

            {place?.types?.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="pricetag" size={15} color={"#4B5563"} />
                  <Text className="text-sm text-gray-700 font-semibold ml-1">
                    Categories
                  </Text>
                </View>
                <View className="flex-wrap flex-row mt-2">
                  {renderPlaceTypes(place.types)}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const fetchTrips = useCallback(async () => {
    try {
      const clerkUserId = user?.id;
      if (!clerkUserId || !trip._id) {
        setError("Userid or tripId is missing");
        return;
      }

      const token = await getToken();

      const response = await axios.get(
        `http://192.168.0.104:3000/api/trips/${trip._id}`,
        {
          params: { clerkUserId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTrip(response.data.trip);
      setError(null);
    } catch (error) {
      console.log("Error", error);
    }
  }, [trip._id, user]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const handleAddPlace = async (data: any) => {
    try {
      console.log("first", data);
      const placeId = data.id;
      if (!placeId || !trip._id) {
        setError("place or trip id is required");
      }

      const token = await getToken();
      await axios.post(
        `http://192.168.0.104:3000/api/trips/${trip._id}/places`,
        { placeId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchTrips();
      setModalVisible(false);
      setSelectedDate(null);
    } catch (error: any) {
      console.log("Error", error);
      setError(error.response.data.error);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="relative w-full h-48">
        <Image
          className="size-full"
          source={{ uri: trip.background || "https://via.placeholder.com/150" }}
        />
        <View className="absolute top-0 left-0 w-full h-full bg-black/30" />
        <TouchableOpacity className="absolute bottom-[-32px] left-4 right-4 bg-white p-4 rounded-xl shadow-md flex-row justify-between items-center">
          <Ionicons name="arrow-back" color="#000" size={24} />
        </TouchableOpacity>
        <View className="absolute bottom-[-32px] left-4 right-4 bg-white p-4 rounded-xl shadow-md flex-row justify-between items-center">
          <View>
            <Text className="text-lg font-semibold">
              Trip to {trip?.tripName || "Unnamed Trip"}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {trip?.startDate ? dayjs(trip.startDate).format("MMM D") : "N/A"}{" "}
              - {trip?.endDate ? dayjs(trip.endDate).format("MMM D") : "N/A"}
            </Text>
          </View>
          <View className="items-center">
            <Image
              className="size-8 rounded-full mb-1"
              source={{
                uri:
                  user?.imageUrl ||
                  "https://randomuser.me/api/portraits/women/1.jpg",
              }}
            />
            <TouchableOpacity className="bg-black rounded-full px-3 py-1">
              <Text className="text-white text-xs">Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-row px-4 mt-12 border-b border-gray-200">
        {["Overview", "Itinerary", "Explore", "$"].map((tab, index) => (
          <TouchableOpacity
            onPress={() => setSelectedTab(tab)}
            className={`mr-6 pb-2 ${
              selectedTab === tab ? "border-b-2 border-orange-500" : ""
            }`}
            key={index}
          >
            <Text>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab == "Overview" && (
        <ScrollView className="px-4 pt-4">
          <View className="mb-6 bg-white rounded-lg p-4">
            <Text className="text-sm text-gray-500 mb-1">
              Wanderlog level: <Text>Basic</Text>
            </Text>
            <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <View className="w-1/4 h-full bg-blue-500" />
            </View>
          </View>
          <View className="flex-row justify-between mb-6">
            {[
              {
                title: "Add a reservation",
                subtitle: "Forward an email or add reservation details",
              },
              {
                title: "Explore things to do",
                subtitle: "Add places from top blogs",
              },
            ].map((card, idx) => (
              <View
                className="w-[48%] bg-white p-4 rounded-lg shadow-sm"
                key={idx}
              >
                <Text className="text-sm font-semibold mb-2">{card.title}</Text>
                <Text className="text-xs text-gray-500 mb-3">
                  {card.subtitle}
                </Text>
                <View className="flex-row justify-between">
                  <Text className="text-blue-500 text-xs font-medium">
                    Skip
                  </Text>
                  <Text className="text-blue-500 text-xs font-medium">
                    Start
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mb-6 bg-white rounded-lg p-4">
            <Text className="font-semibold mb-3 text-base">
              Reservations and attachments
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { label: "Flight", icon: "airplane" },
                { label: "Lodging", icon: "bed" },
                { label: "Rental car", icon: "car" },
                { label: "Restaurant", icon: "restaurant" },
                { label: "Attachment", icon: "attach" },
                { label: "Other", icon: "ellipsis-horizontal" },
              ].map((item, idx) => (
                <View key={idx} className="items-center mr-6">
                  <Ionicons name={item.icon as any} size={24} />
                  <Text className="text-xs mt-1">{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => setShowNotes(!showNotes)}
              className="flex-row p-4 justify-between items-center"
            >
              <Text>Notes</Text>
              <Ionicons
                name={!showNotes ? "chevron-down" : "chevron-up"}
                color="gray"
                size={20}
              />
            </TouchableOpacity>
            {showNotes && (
              <View className="px-4 pb-4">
                <Text className="text-gray-500 text-sm">
                  Write or paste general notes here. Eg. How to get around the
                  local hidden gems
                </Text>
              </View>
            )}
          </View>

          <View className="border-t border-gray-200 bg-white">
            <TouchableOpacity
              onPress={() => setShowPlaces(!showPlaces)}
              className="flex-row p-4 justify-between items-center"
            >
              <Text>Places to visit</Text>
              <Ionicons
                name={!showPlaces ? "chevron-down" : "chevron-up"}
                color="gray"
                size={20}
              />
            </TouchableOpacity>
            {showPlaces && (
              <View className="px-4 pb-4">
                {(trip?.placesToVisit || []).map((place: any, idx: number) =>
                  renderPlaceCard(place, idx)
                )}

                {(!trip?.placesToVisit || trip.placesToVisit.length == 0) && (
                  <Text className="text-sm text-gray-500">
                    No Places added yet
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(null);
                    setModalMode("place");
                    setModalVisible(true);
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-2 mt-2"
                >
                  <Text className="text-sm text-gray-500">Add a place</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      <View className="absolute right-4 bottom-20 space-y-3 items-end">
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AIChat", {
              location: trip?.tripName,
            })
          }
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-400 to bg-purple-600 items-center justify-center shadow"
        >
          <MaterialIcons name="auto-awesome" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity className="w-12 h-12 rounded-full bg-black items-center justify-center shadow mt-2">
          <Ionicons name="map" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity className="w-12 h-12 rounded-full bg-black items-center justify-center shadow mt-2">
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => {
          setModalVisible(false);
          setSelectedDate(null);
          setModalMode("place");
        }}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        {modalMode == "place" && selectedDate !== "Itinerary" ? (
          <>
            <View className="bg-white p-4 rounded-t-2xl h-[60%]">
              <Text>
                {selectedDate
                  ? `Add Place to ${dayjs(selectedDate).format("ddd D/M")}`
                  : "Search for a place"}
              </Text>

              <GooglePlacesAutocomplete
                placeholder="Search for a place"
                fetchDetails={true}
                enablePoweredByContainer={false}
                onPress={async (data, details = null) => {
                  try {
                    const placeId = data.place_id;
                    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
                    const res = await fetch(url);
                    const json = await res.json();

                    if (json.status !== "OK" || !json.result) {
                      throw new Error(
                        `Google places api error ${json.status} || "No res found`
                      );
                    }

                    const d = json.result;
                    console.log("d", JSON.stringify(d, null, 2));
                    const place = {
                      id: placeId,
                      name: d.name || "Unknown Place",
                      briefDescription:
                        d.editorial_summary?.overview?.slice(0, 200) + "..." ||
                        d.reviews?.[0]?.text?.slice(0, 200) + "..." ||
                        `Located in ${
                          d.address_components?.[2]?.long_name ||
                          d.formatted_address ||
                          "this area"
                        }. A nice place to visit.`,
                      photos:
                        d.photos?.map(
                          (photo: any) =>
                            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
                        ) || [],
                      formatted_address:
                        d.formatted_address || "No address available",
                      openingHours: d.opening_hours?.weekday_text || [],
                      phoneNumber: d.formatted_phone_number || "",
                      website: d.website || "",
                      geometry: d.geometry || {
                        location: { lat: 0, lng: 0 },
                        viewport: {
                          northeast: { lat: 0, lng: 0 },
                          southwest: { lat: 0, lng: 0 },
                        },
                      },
                      types: d.types || [],
                      reviews:
                        d.reviews?.map((review: any) => ({
                          authorName: review.author_name || "Unknown",
                          rating: review.rating || 0,
                          text: review.text || "",
                        })) || [],
                    };

                    if (selectedDate) {
                      await handlePlaceToItinerary(place, selectedDate);
                    } else {
                      await handleAddPlace(place);
                    }
                  } catch (error) {
                    console.log("Error", error);
                  }
                }}
                query={{
                  key: GOOGLE_API_KEY,
                  language: "en",
                }}
                styles={{
                  container: {
                    flex: 0,
                  },
                  textInputContainer: {
                    flexDirection: "row",
                    backgroundColor: "#f1f1f1",
                    borderRadius: 30,
                    paddingHorizontal: 10,
                    alignItems: "center",
                  },
                  textInput: {
                    flex: 1,
                    height: 44,
                    color: "#333",
                    fontSize: 16,
                    backgroundColor: "#f1f1f1",
                    borderRadius: 25,
                  },
                  listView: {
                    marginTop: 10,
                    backgroundColor: "#fff",
                  },
                }}
              />
            </View>
          </>
        ) : (
          ""
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default PlanTripScreen;

const styles = StyleSheet.create({});
