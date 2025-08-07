import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { Calendar } from "react-native-calendars";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";

const NewTripScreen = () => {
  const [calenderVisible, setCalenderVisible] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [dispayStart, setDispayStart] = useState("");
  const [dispayEnd, setDispayEnd] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [chosenLocation, setChosenLocation] = useState("");
  const [error, setError] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<any>();
  const { user } = useUser();

  const today = dayjs().format("YYYY-MM-DD");

  const getMarkedDates = () => {
    const marks: any = {};
    const { startDate, endDate } = selectedRange;
    if (startDate && !endDate) {
      marks[startDate] = {
        startingDay: true,
        endingDay: true,
        color: "#FF5722",
        textColor: "white",
      };
      return marks;
    } else if (startDate && endDate) {
      let curr = dayjs(startDate);
      const end = dayjs(endDate);

      while (!curr.isAfter(end)) {
        const formatted = curr.format("YYYY-MM-DD");
        marks[formatted] = {
          color: "#FF5722",
          textColor: "white",
          ...(formatted === startDate && { startingDay: true }),
          ...(formatted === endDate && { endingDay: true }),
        };
        curr = curr.add(1, "day");
      }
    }
    return marks;
  };

  const handleDayPress = (day: any) => {
    const selected = day.dateString;
    if (
      !selectedRange.startDate ||
      (selectedRange.startDate && selectedRange.endDate)
    ) {
      setSelectedRange({ startDate: selected });
    } else if (
      selectedRange.startDate &&
      dayjs(selected).isAfter(selectedRange.startDate)
    ) {
      setSelectedRange({
        ...selectedRange,
        endDate: selected,
      });
    }
  };

  const onSaveDates = () => {
    if (selectedRange.startDate) setDispayStart(selectedRange.startDate);
    if (selectedRange.endDate) setDispayEnd(selectedRange.endDate);
    setCalenderVisible(false);
  };

  const GOOGLE_API_KEY = "AIzaSyCOwvl1GwLyTUyJgaBAk8RHCN64bQQBsGk";

  const handleCreateTrip = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (
        !chosenLocation ||
        !selectedRange.startDate ||
        !selectedRange.endDate
      ) {
        setError("Please select a location and a date range");
      }

      const clerkUserId = user?.id;
      const email = user?.primaryEmailAddress?.emailAddress;

      if (!email || !clerkUserId) {
        setError("User is not authenticated or email is entered");
      }

      let background = "https://via.placeholder.com/150";
      try {
        const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
          chosenLocation
        )}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`;
        const findPlaceRes = await axios.get(findPlaceUrl);
        const placeId = findPlaceRes.data.candidates?.[0]?.place_id;

        if (placeId) {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
          const detailsRes = await axios.get(detailsUrl);
          const photos = detailsRes.data.result?.photos;
          if (photos?.length > 0) {
            background = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
          }
        }
      } catch (error) {
        console.log("Error fetching photo", error);
      }

      const tripData = {
        tripName: chosenLocation,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        startDay: dayjs(selectedRange.startDate).format("dddd"),
        endDay: dayjs(selectedRange.endDate).format("dddd"),
        background,
        clerkUserId,
        userData: {
          email,
          name: user?.fullName || "",
        },
      };

      const response = await axios.post(
        "http://192.168.1.101:3000/api/trips",
        tripData
      );

      const createdTrip = response.data.trip;

      navigation.navigate("PlanTrip", { trip: createdTrip });
    } catch (error) {
      console.log("Error e", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-5">
      <View className="mt-2 mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Plan a new trip
        </Text>
        <Text className="text-base text-gray-500 mb-6">
          Build an itinerary nd map out your travel plans
        </Text>

        <TouchableOpacity
          onPress={() => setSearchVisible(true)}
          className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        >
          <Text className="text-sm font-semibold text-gray-700 mb-1">
            Where to?
          </Text>
          <Text className="text-base text-gray-500">
            {chosenLocation || "Eg. Paris, Tokyo, Mumbai"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCalenderVisible(true)}
          className="flex-row border border-gray-300 rounded-xl px-4 py-3 justify-between mb-4"
        >
          <View className="flex-1 mr-2">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Dates (Optional)
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name="calendar"
                size={16}
                color="#000"
                className="mr-1"
              />
              <Text className="text-sm text-gray-500">
                {dispayStart
                  ? dayjs(dispayStart).format("MMM D")
                  : "Start Date"}
              </Text>
            </View>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-semibold text-gray-700 mb-1 invisible">
              •
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name="calendar"
                size={16}
                color="#666"
                className="mr-1"
              />
              <Text className="text-sm text-gray-500">
                {dispayEnd ? dayjs(dispayEnd).format("MMM D") : "End Date"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between items-center mb-8">
        <TouchableOpacity>
          <Text className="text-sm text-gray-800 font-medium">
            + Invite a tripmate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="people" size={16} color="#666" className="mr-1" />
          <Text className="ml-1 text-sm text-gray-600 font-medium">
            Friends
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="#666"
            className="mr-1"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleCreateTrip}
        className="bg-orange-500 rounded-full py-3 items-center mb-4"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FF5722" />
        ) : (
          <Text className="text-white font-semibold text-base">
            Start Planning
          </Text>
        )}
      </TouchableOpacity>

      {error && <Text className="text-red-500 text-sm mb-4">{error}</Text>}

      <Text className="text-sm text-gray-500 text-center">
        Or see an example for{" "}
        <Text className="font-semibold to-gray-600">NewYork</Text>
      </Text>

      <Modal animationType="slide" transparent visible={calenderVisible}>
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl w-11/12">
            <Calendar
              markingType={"period"}
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              minDate={today}
              theme={{
                todayTextColor: "#FF5722",
                arrowColor: "#00BFFF",
                selectedDayTextColor: "#ccc",
              }}
            />
            <Pressable
              className="p-4 border-t border-gray-200 items-center"
              onPress={onSaveDates}
            >
              <Text className="text-gray-700 font-semibold">Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" visible={searchVisible}>
        <SafeAreaView className="flex-1 bg-white pt-10 px-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity className="mr-3">
              <Ionicons
                onPress={() => setSearchVisible(false)}
                name="close"
                color="#000"
                size={24}
              />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              Search for a place
            </Text>
          </View>
          <GooglePlacesAutocomplete
            placeholder="Search for a place"
            fetchDetails={true}
            enablePoweredByContainer={false}
            onPress={(data, details = null) => {
              if (data?.description) {
                setChosenLocation(data.description);
              }
              setSearchVisible(false);
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default NewTripScreen;

const styles = StyleSheet.create({});
