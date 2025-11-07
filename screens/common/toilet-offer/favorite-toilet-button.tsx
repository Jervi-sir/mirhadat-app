import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { useAuthStore } from "@/zustand/auth-store";
import { useFavoritesStore } from "@/zustand/favorites-store"; // ✅ import
import type { ToiletWithRelationsType } from "@/utils/types";

type Props = {
  toiletId: number;
  /** Optional toilet data if we want to add full item in store when favoriting */
  item?: ToiletWithRelationsType;
  /** Whether this toilet starts favorited */
  initial?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional callback for parent to respond to favorite state changes */
  onChange?: (fav: boolean) => void;
};

export default function FavoriteToiletButton({
  toiletId,
  item,
  initial = false,
  style,
  onChange,
}: Props) {
  const [fav, setFav] = useState<boolean>(!!initial);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((s) => s.token);

  // ✅ Zustand actions
  const addFav = useFavoritesStore((s) => s.add);
  const removeFav = useFavoritesStore((s) => s.remove);

  // keep local state synced if parent updates
  useEffect(() => {
    setFav(!!initial);
  }, [initial]);

  const toggle = async () => {
    if (submitting) return;
    if (!token) {
      Alert.alert("Login required", "Please log in to save favorites.");
      return;
    }

    const next = !fav;
    setFav(next); // optimistic
    setSubmitting(true);

    try {
      if (next) {
        await api.post(
          buildRoute(ApiRoutes.toilets.favorite.add, { toilet: toiletId }),
          {},
          { authRequired: true }
        );
        // ✅ update store
        if (item) addFav(item);
      } else {
        await api.delete(
          buildRoute(ApiRoutes.toilets.favorite.remove, { toilet: toiletId }),
          { authRequired: true }
        );
        // ✅ update store
        removeFav(toiletId);
      }
      onChange?.(next);
    } catch (e) {
      // rollback UI
      setFav(!next);
      Alert.alert("Error", "Could not update favorites.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={submitting}
      style={style}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={fav ? "Remove from favorites" : "Add to favorites"}
    >
      <Text
        style={{
          fontSize: 26,
          color: "#EF4444",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {fav ? "♥" : "♡"}
      </Text>
    </Pressable>
  );
}
