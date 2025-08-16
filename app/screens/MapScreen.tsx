import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { RouteProp, useRoute } from "@react-navigation/native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

type Place = {
  id: string;
  name: string;
  briefDescription: string;
  photos: string[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

type MapRouteParams = {
  MapScreen: {
    places: Place[];
  };
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.8;
const SPACING = 12;

const MapScreen = () => {
  const route = useRoute<RouteProp<MapRouteParams>>();
  const places = route.params?.places || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (places.length > 0 && mapRef.current) {
      const coordinates = places.map((place) => ({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          right: 150,
          top: 150,
          bottom: 150,
          left: 150,
        },
        animated: true,
      });
    }
  }, [places]);

  const moveToRegion = (place: Place) => {
    const region: Region = {
      latitude: place.geometry?.location.lat,
      longitude: place.geometry.location.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    mapRef.current?.animateToRegion(region, 350);
  };

  const onCardScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / (CARD_WIDTH + SPACING)
    );

    if (index !== selectedIndex && places[index]) {
      setSelectedIndex(index);
      moveToRegion(places[index]);
    }
  };

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        style={{ flex: 1, height: "100%" }}
        initialRegion={{
          latitude: places[0]?.geometry?.location?.lat ?? 12.2958,
          longitude: places[0]?.geometry?.location?.lng ?? 76.6394,
          latitudeDelta: 1,
          longitudeDelta: 1,
        }}
      >
        {places.map((place, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: place.geometry?.location.lat,
              longitude: place.geometry?.location.lng,
            }}
          >
            <View
              style={{
                backgroundColor:
                  index === selectedIndex ? "#007AFF" : "#FF3B30",
                padding: index === selectedIndex ? 10 : 6,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          </Marker>
        ))}
      </MapView>

      <View className="absolute bottom-6">
        <FlatList
          ref={flatListRef}
          data={places}
          keyExtractor={(_, i) => i.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + SPACING}
          pagingEnabled
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SPACING }}
          onScroll={onCardScroll}
          renderItem={({ item }) => (
            <View
              className="bg-white shadow-lg rounded-2xl p-4"
              style={{ width: CARD_WIDTH, marginRight: SPACING }}
            >
              <Text className="text-base font-semibold text-black">
                {item?.name || "Unknown Place"}
              </Text>
              {item?.briefDescription && (
                <Text className="text-sm text-gray-500 mt-1">
                  {item?.briefDescription}
                </Text>
              )}

              {item?.photos?.[0] && (
                <Image
                  source={{
                    uri: item?.photos?.[0] || "https://via.placeholder.com/150",
                  }}
                  className="h-24 w-full rounded-lg mt-2"
                  resizeMode="cover"
                />
              )}

              {item?.formatted_address && (
                <Text className="text-sm text-gray-400 mt-1">
                  {item?.formatted_address}
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({});
