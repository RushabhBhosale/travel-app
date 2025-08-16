import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [activePlace, setActivePlace] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [error, setError] = useState<any>("");
  const { getToken } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "",
    amount: "",
    paidBy: "Rushabh Bhosale",
    splitOption: "Dont split",
  });

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

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const stored = await AsyncStorage.getItem("expenses");
        if (stored) {
          setExpenses(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Error loading expenses", err);
      }
    };
    loadExpenses();
  }, []);

  const saveExpenses = async (data: any) => {
    try {
      await AsyncStorage.setItem("expenses", JSON.stringify(data));
    } catch (err) {
      console.error("Error saving expenses", err);
    }
  };

  const getAverageRating = (reviews: any[]): any => {
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
        stars.push(
          <Ionicons key={i} name="star" size={14} color={"#FFD700"} />
        );
      } else if (i === fullStars && halfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color={"#FFD700"} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color={"#FFD700"} />
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

  const renderPlaceCard = (
    place: any,
    index: number,
    isItinerary: boolean = false
  ) => {
    const isActive = activePlace?.name === place.name;
    return (
      <View
        key={index}
        className="mb-4 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
      >
        <TouchableOpacity
          onPress={() => setActivePlace(isActive ? null : place)}
          className="flex-row items-center"
        >
          <Image
            source={{
              uri: place.photos?.[0] || "https://via.placeholder.com/150",
            }}
            className="w-24 h-24 rounded-l-xl"
            resizeMode="cover"
          />
          <View className="flex-1 p-3">
            <Text className="text-gray-800 font-bold text-base mb-1">
              {place.name || "Unknown Place"}
            </Text>
            <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
              {place.briefDescription || "No description available"}
            </Text>
            <View className="flex-row items-center mt-1">
              {renderStars(getAverageRating(place.reviews))}
              <Text className="text-xs text-gray-500 ml-1">
                ({getAverageRating(place.reviews)}/5)
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isActive && (
          <View className="p-4 bg-gray-50 border-t border-gray-200">
            <View className="mb-4">
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color="#4B5563" />
                <Text className="text-sm font-semibold text-gray-700 ml-1">
                  Address
                </Text>
              </View>
              <Text className="text-sm text-gray-600 mt-1">
                {place.formatted_address || "No address available"}
              </Text>
            </View>

            {place.openingHours?.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 mlinant">
                    Today’s Hours
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {getCurrentDayHours(place.openingHours)}
                </Text>
              </View>
            )}

            {place.phoneNumber && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="call" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Phone
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 mt-1">
                  {place.phoneNumber}
                </Text>
              </View>
            )}

            {place.website && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="globe" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Website
                  </Text>
                </View>
                <Text
                  className="text-sm text-blue-600 underline mt-1"
                  numberOfLines={1}
                >
                  {place.website}
                </Text>
              </View>
            )}

            {place.reviews?.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Review
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 italic mt-1">
                  "{place.reviews[0].text.slice(0, 100)}
                  {place.reviews[0].text.length > 100 ? "..." : ""}"
                </Text>
                <View className="flex-row items-center mt-1">
                  {renderStars(place.reviews[0].rating)}
                  <Text className="text-xs text-gray-500 ml-1">
                    — {place.reviews[0].authorName} ({place.reviews[0].rating}
                    /5)
                  </Text>
                </View>
              </View>
            )}

            {place.types?.length > 0 && (
              <View>
                <View className="flex-row items-center">
                  <Ionicons name="pricetag" size={16} color="#4B5563" />
                  <Text className="text-sm font-semibold text-gray-700 ml-1">
                    Categories
                  </Text>
                </View>
                <View className="flex-row flex-wrap mt-1">
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
        `http://192.168.0.101:3000/api/trips/${trip._id}`,
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
      console.log("data", data);
      const placeId = data.place_id;
      if (!placeId || !trip._id) {
        setError("place or trip id is required");
      }

      const token = await getToken();
      console.log("paylll", token, placeId, trip._id);
      await axios.post(
        `http://192.168.0.101:3000/api/trips/${trip._id}/places`,
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

  const generateTripDates = () => {
    const start = dayjs(trip.startDate || new Date());
    const end = dayjs(trip.endDate || new Date());
    const days = [];

    for (let d = start; d.isBefore(end) || d.isSame(end); d = d.add(1, "day")) {
      days.push(d);
    }

    return days.map((d) => ({
      label: d.format("ddd D/M"),
      value: d.format("YYYY-MM-DD"),
    }));
  };

  const handleAddExpense = () => {
    if (
      !expenseForm.description ||
      !expenseForm.category ||
      !expenseForm.amount
    ) {
      setError("Please fill all expense fields");
      return;
    }

    const newExpense = {
      id: Date.now().toString(),
      ...expenseForm,
      price: parseFloat(expenseForm.amount),
      date: dayjs().format("YYYY-MM-DD"),
    };

    setExpenses((prev) => {
      const updated = [...prev, newExpense];
      saveExpenses(updated); // persist
      return updated;
    });
    setExpenseForm({
      description: "",
      category: "",
      amount: "",
      paidBy: "Rushabh Bhosale",
      splitOption: "Don't Split",
    });
    setModalVisible(false);
    setModalMode("place");
  };

  const handleEditExpense = () => {
    if (
      !editingExpense ||
      !expenseForm.description ||
      !expenseForm.category ||
      !expenseForm.amount
    ) {
      setError("Please fill all expense fields");
      return;
    }

    setExpenses((prev: any) => {
      const updated = prev.map((expense: any) =>
        expense.id === editingExpense.id
          ? {
              ...expense,
              ...expenseForm,
              price: parseFloat(expenseForm.amount),
            }
          : expense
      );
      saveExpenses(updated); // persist
      return updated;
    });
    setExpenseForm({
      description: "",
      category: "",
      amount: "",
      paidBy: "Rushabh Bhosale",
      splitOption: "Don't Split",
    });
    setEditingExpense(null);
    setModalVisible(false);
    setModalMode("place");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((expense) => expense.id !== id);
      saveExpenses(updated); // persist
      return updated;
    });
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlaces, setAiPlaces] = useState([]);
  const fetchAIPlaces = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer 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`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
              {
                role: "system",
                content: `You are a travel assistant for ${
                  trip.tripName || "a popular destination"
                }. Return a JSON array of 5 objects, each representing a top place to visit. Each object must have exactly these fields: "name" (string), "description" (string, 50-100 words), "address" (string). Ensure the response is valid JSON, with no backticks, markdown, or extra text. Example: [{"name":"Place 1","description":"A beautiful place...","address":"123 Main St"}]`,
              },
              {
                role: "user",
                content: `List 5 top places to visit in ${
                  trip.tripName || "a popular destination"
                } in JSON format.`,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      let content = data?.choices?.[0]?.message?.content.trim();
      content = content.replace(/```json\n?|\n?```/g, "");
      const jsonMatch = content.match(/\[.*\]/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in response");
      }
      content = jsonMatch[0];

      let places;
      try {
        places = JSON.parse(content);
      } catch (error) {
        console.log("Error parsing the content", error);
      }

      if (!Array.isArray(places) || places.length === 0) {
        throw new Error("ai response missing required fields");
      }

      const placesWithDetails = await Promise.all(
        places.map(async (place: any) => {
          try {
            const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
              `${place.name}, ${place.address}`
            )}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
            const findPlaceRes = await axios.get(findPlaceUrl);
            const placeId = findPlaceRes.data.candidates?.[0]?.place_id;

            if (!placeId) {
              throw new Error(`No place_id found for ${place.name}`);
            }

            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,photos,opening_hours,formatted_phone_number,website,geometry,types,reviews,editorial_summary&key=${GOOGLE_API_KEY}`;
            const detailsRes = await axios.get(detailsUrl);
            const d = detailsRes.data.result;

            if (!d) {
              throw new Error(`No details found for ${place.name}`);
            }

            return {
              id: placeId,
              name: d.name || place.name,
              briefDescription:
                d.editorial_summary?.overview?.slice(0, 200) + "..." ||
                place.description?.slice(0, 200) + "..." ||
                `Located in ${
                  d.address_components?.[2]?.long_name ||
                  d.formatted_address ||
                  "this area"
                }. A nice place to visit.`,
              photos: d.photos?.map(
                (photo: any) =>
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
              ) || ["https://via.placeholder.com/150"],
              formatted_address: d.formatted_address || place.address,
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
              types: d.types || ["point_of_interest"],
              reviews:
                d.reviews?.map((review: any) => ({
                  authorName: review.author_name || "Unknown",
                  rating: review.rating || 0,
                  text: review.text || "",
                })) || [],
            };
          } catch (err: any) {
            console.warn(
              `Failed to fetch details for ${place.name}:`,
              err.message
            );
            return {
              id: `ai-${place.name.replace(/\s/g, "-").toLowerCase()}`,
              name: place.name,
              briefDescription: place.description,
              formatted_address: place.address,
              photos: ["https://via.placeholder.com/150"],
              types: ["point_of_interest"],
              openingHours: [],
              phoneNumber: "",
              website: "",
              geometry: {
                location: { lat: 0, lng: 0 },
                viewport: {
                  northeast: { lat: 0, lng: 0 },
                  southwest: { lat: 0, lng: 0 },
                },
              },
              reviews: [],
            };
          }
        })
      );

      setAiLoading(false);
      setAiPlaces(placesWithDetails);
      setModalMode("ai");
      setModalVisible(true);
    } catch (error: any) {
      console.log("Error fetching ai places", error.message);
      setError("Failed to fetch ai recommendations");
    } finally {
      setAiLoading(false);
    }
  };

  const renderItineraryTab = () => {
    const dates = generateTripDates();
    return (
      <ScrollView className="px-4 pt-4 bg-white">
        <TouchableOpacity
          disabled={aiLoading}
          onPress={fetchAIPlaces}
          className="bg-blue-500 rounded-lg mb-4 items-center"
        >
          <View className="flex-row items-center p-3 gap-2">
            {aiLoading ? (
              <ActivityIndicator size="small" color={"#fff"} />
            ) : (
              <MaterialIcons name="auto-awesome" color={"#fff"} size={20} />
            )}
            <Text className="text-white font-medium ml-2">
              {aiLoading
                ? "Fetching AI Suggestions"
                : "Use AI to create Itinerary"}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates?.map((date: any, idx) => (
              <TouchableOpacity
                onPress={() => setSelectedDate(date.value)}
                className={`px-4 py-2 mr-2 rounded-lg ${
                  selectedDate === date.value ? "bg-blue-500" : "bg-gray-100"
                }`}
                key={idx}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedDate === date.value ? "text-white" : "text-gray-700"
                  }`}
                >
                  {date.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {dates.map((date, index) => {
          const itineraryForDate = (trip.itinerary || []).find(
            (item: any) => item.date === date.value
          );

          const activities = itineraryForDate?.activities || [];

          return (
            <View key={index} className="mb-8">
              <View className="flex-row items-center mb-2">
                <Text className="text-2xl font-extrabold mr-2">
                  {date.label}
                </Text>
                <Text className="text-gray-400 font-medium">
                  Add Subheading
                </Text>
              </View>
              <View className="flex-row items-center mb-2 gap-2">
                <Text className="text-blue-600 text-sm font-semibold">
                  Auto Fill day
                </Text>
                <Text className="text-blue-600 text-sm font-semibold">
                  Optimized route
                </Text>
                <Text className="text-xs bg-orange-400 text-white px-1.5 py-0.5 rounded">
                  Pro
                </Text>
              </View>

              {activities.length > 0 ? (
                activities.map((place: any, idx: number) =>
                  renderPlaceCard(place, idx, true)
                )
              ) : (
                <Text className="text-sm text-gray-500 mb-3">
                  No activities added for this date
                </Text>
              )}

              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(date.value);
                  setModalMode("place");
                  setModalVisible(true);
                }}
                className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 mb-3"
              >
                <Ionicons name="location-outline" color={"#777"} size={18} />
                <Text className="ml-2 text-gray-500">Add a place</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const handleAddPlaceToItinerary = async (place: any, date: string) => {
    try {
      if (!trip._id || !place) {
        setError("TripId or place is missing");
        return;
      }

      const token = await getToken();
      const payload =
        place.id || place.place_id
          ? { placeId: place.id || place.place_id, date }
          : { placeData: place, date };

      await axios.post(
        `http://192.168.0.101:3000/api/trips/${trip._id}/itinerary`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchTrips();
      setModalVisible(false);
      setSelectedDate(null);
    } catch (error: any) {
      console.log("Error add place to itinerary", error);
      setError(
        error?.response?.data?.error || "Failed to add place to itinerary"
      );
    }
  };

  const renderExpenseTab = () => {
    const total = expenses.reduce(
      (sum, expenses) => sum + (expenses.price || expenseForm.amount || 0),
      0
    );

    return (
      <ScrollView className="px-4 pt-4 bg-white">
        <View className="mb-6">
          <Text className="text-2xl font-extrabold">Budget</Text>
          <Text className="text-sm text-gray-500 mb-4">
            Track your expenses for this trip{" "}
          </Text>
          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="text-lg font-semibold">
              Total: Rs. {total.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setModalMode("expense");
              setModalVisible(true);
            }}
            className="bg-blue-500 p-3 rounded-lg items-center"
          >
            <Text className="text-white font-medium">Add New Expense</Text>
          </TouchableOpacity>
        </View>
        {expenses.map((expense: any, index) => (
          <View key={index} className="mb-4 bg-gray-50 rounded-lg p-3 shadow">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-sm font-semibold">
                  {expense.description}
                </Text>
                <Text className="text-xs text-gray-500">
                  {expense.category}
                </Text>
                <Text className="text-xs text-gray-500">
                  Paid by: {expense.paidBy}
                </Text>
                <Text className="text-xs text-gray-500">
                  Split: {expense.splitOption}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold">
                  ${(expense.price || expense.amount || 0).toFixed(2)}
                </Text>
                <Text className="text-xs text-gray-400">
                  {dayjs(expense.date).format("MMM D, YYYY")}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-end mt-2 space-x-2">
              <TouchableOpacity
                onPress={() => {
                  setEditingExpense(expense);
                  setExpenseForm({
                    description: expense.description,
                    category: expense.category,
                    amount: (expense.price || expense.amount || 0).toString(),
                    paidBy: expense.paidBy,
                    splitOption: expense.splitOption,
                  });
                  setModalMode("editExpense");
                  setModalVisible(true);
                }}
                className="bg-blue-100 p-2 rounded"
              >
                <Ionicons name="pencil" size={16} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteExpense(expense.id)}
                className="bg-red-100 p-2 rounded"
              >
                <Ionicons name="trash" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
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

      {selectedTab == "Itinerary" && renderItineraryTab()}

      {selectedTab == "$" && renderExpenseTab()}

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
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Map", {
              places: trip?.placesToVisit || [],
            })
          }
          className="w-12 h-12 rounded-full bg-black items-center justify-center shadow mt-2"
        >
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
        <View className="bg-white p-4 rounded-t-xl h-[60%]">
          {modalMode === "place" && selectedTab !== "Itinerary" ? (
            <>
              <Text className="text-lg font-semibold mb-4">
                Search for a place
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
                        `Google Places API error: ${
                          json.status || "No result found"
                        }`
                      );
                    }

                    const d = json.result;
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

                    await handleAddPlace(data);
                  } catch (error: any) {
                    console.error("Place detail error:", error.message);
                    setError(`Failed to fetch place details: ${error.message}`);
                  }
                }}
                query={{
                  key: GOOGLE_API_KEY,
                  language: "en",
                }}
                styles={{
                  container: { flex: 0 },
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
            </>
          ) : modalMode === "place" && selectedTab === "Itinerary" ? (
            <>
              <Text className="text-lg font-semibold my-2">
                {selectedDate
                  ? `Add a place to ${dayjs(selectedDate).format("ddd D/M")}`
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
                        `Google Places API error: ${
                          json.status || "No result found"
                        }`
                      );
                    }

                    const d = json.result;
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
                      await handleAddPlaceToItinerary(place, selectedDate);
                    } else {
                      setError(
                        "Please select a date to add this place to the itinerary"
                      );
                    }
                  } catch (error: any) {
                    console.error("Place detail error:", error.message);
                    setError(`Failed to fetch place details: ${error.message}`);
                  }
                }}
                query={{
                  key: GOOGLE_API_KEY,
                  language: "en",
                }}
                styles={{
                  container: { flex: 0 },
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

              <Text className="text-sm font-semibold mb-1 mt-2">
                Select Date
              </Text>
              <View className="flex-row gap-2 items-center">
                {generateTripDates().map((date: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedDate(date.value)}
                    className={`px-3 py-1.5 mr-2 rounded-full border ${
                      selectedDate === date.value
                        ? "bg-blue-500 border-b-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        selectedDate === date.value
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(trip?.placesToVisit || []).length > 0 && (
                <View className="flex-1 mt-2">
                  <Text className="text-sm font-semibold mb-1">
                    Previously Added Places
                  </Text>
                  <ScrollView className="flex-1">
                    {trip?.placesToVisit.map((place: any, idx: number) => (
                      <TouchableOpacity
                        onPress={() => {
                          if (selectedDate) {
                            handleAddPlaceToItinerary(place, selectedDate);
                          } else {
                            setError("Please select a date to add this place");
                          }
                        }}
                        key={idx}
                        className="flex-row items-center p-2 border-b border-gray-200"
                      >
                        <Image
                          className="size-12 rounded-md mr-2"
                          source={{ uri: place?.photos[0] }}
                        />
                        <View className="">
                          <Text className="text-sm font-medium">
                            {place?.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {place?.formatted_address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : modalMode === "ai" ? (
            <>
              <Text>
                {selectedDate
                  ? `Add AI suggested place to ${dayjs(selectedDate).format(
                      "ddd D/M"
                    )}`
                  : "Select a date for ai suggested places"}
              </Text>

              <Text className="text-sm font-semibold mt-2 mb-1">
                Select Date
              </Text>
              <View className="flex-row gap-2 items-center">
                {generateTripDates().map((date: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedDate(date.value)}
                    className={`px-3 py-1.5 mr-2 rounded-full border ${
                      selectedDate === date.value
                        ? "bg-blue-500 border-b-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        selectedDate === date.value
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {aiPlaces?.length > 0 && (
                <View>
                  <Text className="text-sm font-semibold mb-1">
                    AI Suggested Places
                  </Text>

                  <ScrollView>
                    {aiPlaces.map((place: any, idx: number) => (
                      <TouchableOpacity
                        onPress={() => {
                          if (selectedDate) {
                            handleAddPlaceToItinerary(place, selectedDate);
                          } else {
                            setError("Please select a date to add this place");
                          }
                        }}
                        key={idx}
                        className="flex-row items-center p-2 border-b border-gray-200"
                      >
                        <Image
                          className="size-12 rounded-md mr-2"
                          source={{ uri: place?.photos[0] }}
                        />
                        <View className="">
                          <Text className="text-sm font-medium">
                            {place?.name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {place?.formatted_address}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-lg font-semibold mb-4">
                {modalMode === "editExpense"
                  ? "Edit Expense"
                  : "Add New Expense"}
              </Text>
              <ScrollView>
                <Text className="text-sm font-medium mb-2">Description</Text>
                <TextInput
                  value={expenseForm.description}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, description: text })
                  }
                  placeholder="Enter expense description"
                  className="bg-gray-200 p-3 rounded-lg mb-4"
                />

                <Text className="text-sm font-medium mb-2">Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {categories.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() =>
                        setExpenseForm({ ...expenseForm, category })
                      }
                      className={`px-4 py-2 mr-2 rounded-lg ${
                        expenseForm.category === category
                          ? "bg-blue-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          expenseForm.category === category
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text className="text-sm font-medium mb-2">Amount</Text>
                <TextInput
                  value={expenseForm.amount}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, amount: text })
                  }
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg mb-4"
                />

                <Text className="text-sm font-medium mb-2">Paid By</Text>
                <TextInput
                  value={expenseForm.paidBy}
                  onChangeText={(text) =>
                    setExpenseForm({ ...expenseForm, paidBy: text })
                  }
                  placeholder="Enter name"
                  className="bg-gray-100 p-3 rounded-lg mb-4"
                />

                <Text className="text-sm font-medium mb-2">Split Option</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                >
                  {splitOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() =>
                        setExpenseForm({
                          ...expenseForm,
                          splitOption: option.value,
                        })
                      }
                      className={`px-4 py-2 mr-2 rounded-lg ${
                        expenseForm.splitOption === option.value
                          ? "bg-blue-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          expenseForm.splitOption === option.value
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={
                    modalMode === "editExpense"
                      ? handleEditExpense
                      : handleAddExpense
                  }
                  className="bg-blue-500 p-3 rounded-lg items-center"
                >
                  <Text className="text-white font-medium">
                    {modalMode === "editExpense"
                      ? "Save Changes"
                      : "Add Expense"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PlanTripScreen;

const styles = StyleSheet.create({});
