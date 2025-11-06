import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import api from "@/utils/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api";
import { useAuthPrompt } from "@/context/auth-prompt";
import { useAuthStore } from "@/zustand/authStore";

type Props = {
  toiletId: number;
  initial?: boolean;
  style?: StyleProp<ViewStyle>;
  onChange?: (fav: boolean) => void;
};

export default function FavoriteToiletButton({ toiletId, initial = false, style, onChange }: Props) {
  const [fav, setFav] = useState<boolean>(!!initial);
  const [submitting, setSubmitting] = useState(false);
  const { promptAuth, ensureAuth } = useAuthPrompt();

  const token = useAuthStore((state) => state.token);

  // keep in sync if parent data changes (refetch or nav focus)
  useEffect(() => {
    setFav(!!initial);
  }, [initial]);

  // FavoriteToiletButton.tsx
  const toggle = async () => {
    if (submitting) return;
    const next = !fav;

    // 1) Ensure user is logged in (shows your ActionSheet)
    const ok = await ensureAuth();       // <- THIS will open the sheet
    if (!ok) return;                     // user cancelled

    // 2) Proceed with API after login
    setFav(next);
    setSubmitting(true);
    try {
      if (next) {
        await api.post(buildRoute(ApiRoutes.toilets.favorite.add, { toilet: toiletId }));
      } else {
        await api.delete(buildRoute(ApiRoutes.toilets.favorite.remove, { toilet: toiletId }));
      }
      onChange?.(next);
    } catch (e) {
      setFav(!next); // rollback
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
      <Text style={{ fontSize: 26, color: "#EF4444", opacity: submitting ? 0.6 : 1 }}>
        {fav ? "♥" : "♡"}
      </Text>
    </Pressable>
  );
}
