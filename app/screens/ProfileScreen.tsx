import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Entypo, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import dayjs from "dayjs";

const ProfileScreen = () => {
  const { signOut } = useClerk();
  const navigation = useNavigation<any>();
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [rawTrips, setRawTrips] = useState([]);
  const { user } = useUser();
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log("Error", error);
    }
  };

  const fetchTrips = useCallback(async () => {
    try {
      const clerkUserId = user?.id;
      if (!clerkUserId) {
        setError("User not authenticated");
        return;
      }

      const response = await axios.get("http://192.168.1.101:3000/api/trips", {
        params: { clerkUserId },
      });

      const formattedTrips = response.data.trips.map((trip: any) => ({
        id: trip._id,
        name: trip.tripName,
        date: `${dayjs(trip.startDate).format("D MMM")} - ${dayjs(
          trip.endDate
        ).format("D MMM")}`,
        image: trip.background || "https://via.placeholder.com/150",
        places: trip.placesToVisit?.length || 0,
        daysLeft: dayjs(trip.startDate).isAfter(dayjs())
          ? dayjs(trip.startDate).diff(dayjs(), "day")
          : null,
      }));

      setTrips(formattedTrips);
      setRawTrips(response.data.trips);
    } catch (error: any) {
      console.log("Error", error);
      setError(error.response.data?.error || "Failed to fetch the trip");
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const profileImage =
    user?.imageUrl &&
    user.externalAccounts.some((acc: any) => acc.provider == "oauth_google")
      ? user?.imageUrl
      : "https://cdn-icons-png.flaticon.com/128/3177/3177440.png";
  const email = user?.primaryEmailAddress?.emailAddress || "No email address";
  const name = user?.fullName || "User";
  const handle = `@${user?.username || user?.id.slice(0, 8)}`;
  console.log("trips", trips);
  return (
    <SafeAreaView className="bg-white flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="bg-pink-100 items-center pb-6 rounded-b-3xl relative">
          <View className="absolute top-4 left-4 bg-yellow-400 px-3 py-1 rounded-full">
            <Text className="text-xs font-semibold text-white">PRO</Text>
          </View>

          <View>
            <Image
              source={{ uri: profileImage }}
              className="size-24 rounded-full"
            />
          </View>

          <Text className="mt-3 text-lg font-semibold">{name}</Text>
          <Text className="text-gray-500">{handle}</Text>
          <Text className="text-gray-500 text-xs mt-1">{email}</Text>

          <View className="flex-row justify-center mt-4 space-x-12">
            <View className="items-center">
              <Text className="font-bold text-base">0</Text>
              <Text className="text-xs text-gray-500 tracking-wide">
                Followers
              </Text>
            </View>

            <View className="items-center">
              <Text className="font-bold text-base">0</Text>
              <Text className="text-xs text-gray-500 tracking-wide">
                Following
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white text-base">Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
          <Text className="text-sm text-orange-500 font-semibold mr-6">
            Trips
          </Text>
          <Text className="text-sm text-gray-400 mr-auto">Guides</Text>
          <TouchableOpacity className="flex-row items-center space-x-1">
            <Ionicons name="swap-vertical" size={16} color="#666" />
            <Text className="text-sm text-gray-500">Sort</Text>
          </TouchableOpacity>
        </View>

        {trips.length == 0 && !error && (
          <View className="px-4 mt-4">
            <Text className="text-gray-500 text-sm">
              No Trips Found. Create a new trip!
            </Text>
          </View>
        )}

        {trips.map((trip: any, index) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Home", {
                screen: "PlanTrip",
                params: { trip: rawTrips[index] },
              })
            }
            className="flex-row items-start bg-white rounded-xl shadow-sm mt-4 p-3"
            key={index}
          >
            <Image
              source={{ uri: trip.image }}
              className="w-16 h-16 rounded-lg mr-3"
            />
            <View className="flex-1">
              {trip.daysLeft && (
                <Text className="text-xs bg-orange-100 px-2 py-0.5 rounded-full self-start font-semibold mb-1">
                  In {trip.daysLeft} days
                </Text>
              )}
              <Text className="text-sm font-semibold text-gray-500 mb-1">
                {trip?.name}
              </Text>
              <View className="flex-row items-center">
                <Image
                  source={{ uri: profileImage }}
                  className="size-4 rounded-full mr-2"
                />
                <Text className="text-sm text-gray-500">
                  {trip.date} • {trip.places} places
                </Text>
              </View>
            </View>
            <Entypo name="dots-three-vertical" size={14} color="#999" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({});
