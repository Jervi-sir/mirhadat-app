// NavigationScreen.tsx
import React from "react";
import { Pressable, View } from "react-native";
import { createBottomTabNavigator, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Routes } from "@/utils/variables/routes";
import { theme, S, R, shadow, withAlpha } from "@/ui/theme";
import { List, Map, Heart, User } from "lucide-react-native";

import M1Navigation from "./m1/m1-navigation";
import M2Navigation from "./m2/m2-navigation";
import M3Navigation from "./m3/m3-navigation";
import M4Navigation from "./m4/m4-navigation";

const Tab = createBottomTabNavigator();

const TabItems = [
  { key: "Explore", routeName: Routes.M1, icon: List, component: M1Navigation },
  { key: "Map", routeName: Routes.M2, icon: Map, component: M2Navigation },
  { key: "Favorites", routeName: Routes.M3, icon: Heart, component: M3Navigation },
  { key: "Profile", routeName: Routes.M4, icon: User, component: M4Navigation },
];

function TabIcon({
  focused,
  Icon,
  onPress,
}: {
  focused: boolean;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}) {
  const iconColor = focused ? theme.colors.primary : theme.text.tertiary;
  const bg = focused ? withAlpha(theme.colors.primary, 0.12) : "transparent";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          width: 60,
          borderRadius: 20,
          backgroundColor: bg,
        },
        pressed && { opacity: 0.9 },
      ]}
      hitSlop={theme.hitSlop}
    >
      <Icon size={20} color={iconColor} />
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "center",
          backgroundColor: theme.bg.surface,
          borderRadius: R.xl,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          // paddingHorizontal: 16,
          paddingVertical: 10,
          position: "absolute",
          bottom: Math.max(insets.bottom, 12),
          width: 290,
          ...shadow(3),
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TabItems.find((t) => t.routeName === route.name);
          const Icon = (meta?.icon ?? List) as any;

          const onPress = () => {
            const e = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };

          return <TabIcon key={route.key} focused={focused} Icon={Icon} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

export default function NavigationScreen() {
  return (
    <Tab.Navigator
      initialRouteName={Routes.M1}
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { position: "absolute", height: 0 },
      }}
    >
      {TabItems.map((tab) => (
        <Tab.Screen key={tab.key} name={tab.routeName} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}
