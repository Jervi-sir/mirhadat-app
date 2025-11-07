// screens/MapPickerScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, MapPressEvent, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ScreenWrapper } from "@/components/screen-wrapper";
import { ArrowLeft } from "lucide-react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Params = {
  initial?: { latitude: number; longitude: number };
  onPick?: (c: { latitude: number; longitude: number }) => void;
};

const DEFAULT_REGION: Region = {
  latitude: 36.7525,    // Algiers fallback
  longitude: 3.04197,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const MapPickerScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute() as any as { params?: Params };
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(
    route.params?.initial ?? null
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        if (route.params?.initial) {
          // Already have an initial position
          setRegion({
            latitude: route.params.initial.latitude,
            longitude: route.params.initial.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
          setLoading(false);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoading(false);
          return; // we’ll stay on DEFAULT_REGION
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        const nextRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(nextRegion);
        setMarker({ latitude, longitude });
      } catch (e: any) {
        console.warn("Location error", e?.message || e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
  };

  const useMyLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Enable location permission to use this feature.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const nextRegion: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(nextRegion);
      setMarker({ latitude, longitude });
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch (e: any) {
      Alert.alert("Location error", e?.message || "Could not get your location.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!marker) {
      Alert.alert("Pick a spot", "Tap on the map to set a location.");
      return;
    }
    route.params?.onPick?.(marker);
    navigation.goBack();
  };

  return (
    <ScreenWrapper>

      <View style={{ flex: 1, position: 'relative' }}>
        <View style={{ 
          position: 'absolute', left: 10, top: 4, zIndex: 999,
          flexDirection: 'row', alignItems: 'center', gap: 8 
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              height: 40, width: 40, borderRadius: 100, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'
            }}
          >
            <ArrowLeft />
          </TouchableOpacity>
          <View style={{ padding: 12, gap: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>Pick location</Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8 }}>Loading map…</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={region}
              onPress={onMapPress}
            >
              {marker ? <Marker coordinate={marker} draggable onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)} /> : null}
            </MapView>
          )}
        </View>

        <View
          style={{
            padding: 12,
            flexDirection: "row",
            gap: 8,
            justifyContent: "space-between",
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Pressable
            onPress={useMyLocation}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#ddd",
              alignItems: "center",
            }}
          >
            <Text>Use my location</Text>
          </Pressable>

          <Pressable
            onPress={confirm}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: "#111",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Confirm</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>

  );

};

export default MapPickerScreen;