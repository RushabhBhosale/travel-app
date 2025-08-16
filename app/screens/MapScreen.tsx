import { FlatList, StyleSheet, Text, View } from "react-native";
import React, { useRef, useState } from "react";
import { RouteProp, useRoute } from "@react-navigation/native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

const MapScreen = () => {
  const route = useRoute<RouteProp<MapRouteParams>>();
  const places = route.params?.places || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mapRef = useRef<MapView>(null);
  const flatListRef = useRef<FlatList>(null);
  console.log("places", places[0]?.geometry);
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
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({});
