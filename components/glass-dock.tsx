// components/GlassDock.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { MapPin, Home, Heart, User2 } from "lucide-react-native";
import { Routes } from "@/utils/variables/routes";

type Props = {
  navRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>;
};

type Item = {
  key: string;
  label: string;
  route: string;
  icon: React.ReactNode;
};

export default function GlassDock({ navRef }: Props) {
  const ins = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.95)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const [routeName, setRouteName] = useState<string | undefined>(
    navRef.getCurrentRoute()?.name
  );

  // Subscribe to navigation state from the container ref
  useEffect(() => {
    const unsub = navRef.addListener?.("state", () => {
      setRouteName(navRef.getCurrentRoute()?.name);
    });
    // in case we mounted before ready
    setRouteName(navRef.getCurrentRoute()?.name);
    return unsub as any;
  }, [navRef]);

  const hidden = useMemo(
    () =>
      routeName === Routes.LoginScreen ||
      routeName === Routes.RegisterScreen ||
      routeName === Routes.ToiletOfferScreen /* hide if you want on details */,
    [routeName]
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: hidden ? 0 : 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: hidden ? 0.98 : 1, useNativeDriver: true }),
    ]).start();
  }, [hidden, fade, scale]);

  const items: Item[] = useMemo(
    () => [
      { key: "discover", label: "Discover", route: Routes.DiscoverScreen,     icon: <Home size={20} color="#111827" /> },
      { key: "map",      label: "Map",      route: Routes.DiscoverMapScreen,  icon: <MapPin size={20} color="#111827" /> },
      { key: "fav",      label: "Saved",    route: "FavoritesScreen" as any,  icon: <Heart size={20} color="#111827" /> },
      { key: "me",       label: "Me",       route: "ProfileScreen" as any,    icon: <User2 size={20} color="#111827" /> },
    ],
    []
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents={hidden ? "none" : "auto"}
        style={[
          styles.wrap,
          {
            bottom: ins.bottom + 10,
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        <GlassSurface>
          <View style={styles.row}>
            {items.map((it) => {
              const active = routeName === it.route;
              return (
                <DockButton
                  key={it.key}
                  active={active}
                  label={it.label}
                  icon={it.icon}
                  onPress={() => {
                    if (!active) navRef.navigate(it.route as never);
                  }}
                />
              );
            })}
          </View>
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

function GlassSurface({ children }: { children: React.ReactNode }) {
  return (
    <BlurView
      intensity={Platform.OS === "ios" ? 28 : 24}
      tint="light"
      style={styles.glass}
    >
      <View style={styles.glassBorder} />
      {children}
    </BlurView>
  );
}

function DockButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
      style={({ pressed }) => [
        styles.btn,
        active && styles.btnActive,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>{icon}</View>
      <Text style={[styles.btnLabel, active && styles.btnLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    alignItems: "center",
  },
  glass: {
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: "hidden",
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    gap: 2,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnActive: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  iconWrapActive: {
    backgroundColor: "#ffffff",
  },
  btnLabel: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "600",
  },
  btnLabelActive: {
    color: "#0f172a",
  },
});
