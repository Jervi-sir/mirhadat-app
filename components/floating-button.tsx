import React, { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View, ViewProps, useWindowDimensions } from "react-native";
import { HeartIcon, ListIcon, LocationEditIcon, MapIcon, PlusIcon, ThumbsUpIcon, UserIcon } from "lucide-react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDecay,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CommonActions, StackActions, useNavigation, useNavigationState } from "@react-navigation/native";
import { Routes } from "@/utils/variables/routes";

interface FloatingButtonProps extends ViewProps {
  onPress?: () => void;
  edgeMargin?: number;        // distance from edges when snapped
  remember?: boolean;         // hook up AsyncStorage if you want later
}

const FAB_SIZE = 60;
const SECONDARY_SIZE = 48;
const SPRING = { damping: 18, stiffness: 280, mass: 0.9 };
const STACK_GAP = 10; // space between secondary pills
const baseOffset = (i: number) => i * (SECONDARY_SIZE + STACK_GAP); // i=1..N

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(v, min), max);
}

export function FloatingButton({
  onPress,
  style,
  edgeMargin = 12,
  ...rest
}: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useSharedValue(0);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Position state (top-left of container)
  const x = useSharedValue(W - FAB_SIZE - edgeMargin);
  const y = useSharedValue(
    H - FAB_SIZE - Math.max(edgeMargin + insets.bottom, edgeMargin + 8)
  );

  // Bounds (account for safe areas + size)
  const bounds = useMemo(() => {
    const minX = edgeMargin;
    const maxX = W - FAB_SIZE - edgeMargin;
    const minY = edgeMargin + insets.top;
    // Leave a bit more room at bottom for gesture bar / tabs
    const maxY = H - FAB_SIZE - Math.max(edgeMargin + insets.bottom, edgeMargin + 8);
    return { minX, maxX, minY, maxY };
  }, [W, H, insets, edgeMargin]);

  /* ------------------------ FAB menu animations ------------------------ */
  const rotationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: isOpen ? "45deg" : "0deg" }],
  }));



  function toggleMenu() {
    onPress?.();
    setIsOpen((prev) => {
      animation.value = prev ? 0 : 1;
      return !prev;
    });
  }

  /* --------------------------- Drag gesture ---------------------------- */
  const start = { x: 0, y: 0 };

  const pan = Gesture.Pan()
    .enabled(!isOpen) // disable drag while open, so taps hit actions
    .onStart(() => {
      start.x = x.value;
      start.y = y.value;
    })
    .onChange((e) => {
      const nx = clamp(start.x + e.translationX, bounds.minX, bounds.maxX);
      const ny = clamp(start.y + e.translationY, bounds.minY, bounds.maxY);
      x.value = nx;
      y.value = ny;
    })
    .onEnd((e) => {
      // Inertial throw with clamp
      x.value = withDecay(
        {
          velocity: e.velocityX,
          clamp: [bounds.minX, bounds.maxX],
          deceleration: 0.998, // slightly sticky for better control
        },
        // After decay finishes, snap to nearest horizontal edge
        (finished) => {
          const mid = (bounds.minX + bounds.maxX) / 2;
          const targetX = x.value < mid ? bounds.minX : bounds.maxX;
          x.value = withSpring(targetX, SPRING);
        }
      );

      y.value = withDecay({
        velocity: e.velocityY,
        clamp: [bounds.minY, bounds.maxY],
        deceleration: 0.998,
      });
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));


  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrapper, containerStyle]} pointerEvents="box-none">
        <View style={[styles.container, style]} {...rest}>
          {/* Secondary buttons (now absolute, stacked over the FAB) */}
          <Tools
            isOpen={isOpen}
            animation={animation}
          />

          {/* Main FAB */}
          <TouchableOpacity activeOpacity={0.8} onPress={toggleMenu}>
            <Animated.View style={[styles.button, styles.menu, rotationAnimatedStyle]}>
              <PlusIcon size={32} color="#ffffff" />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// styles: key tweaks are overflow: 'visible' and left-centering the pills
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 99,
  },
  container: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible", // <<< don't clip the rising pills
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowRadius: 10,
    shadowColor: "#f02a4b",
    shadowOpacity: 0.3,
    shadowOffset: { height: 10, width: 10 },
    elevation: 10,
  },
  menu: { backgroundColor: "#f02a4b" },
  secondaryAbs: {
    position: "absolute",
    bottom: -50, // start stacked at FAB origin and animate up
    left: -26, // center horizontally
    width: SECONDARY_SIZE,
    height: SECONDARY_SIZE,
    borderRadius: SECONDARY_SIZE / 2,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    // optional shadow
    elevation: 6,
    shadowRadius: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { height: 4, width: 0 },
  },
});


const Tools = ({ isOpen, animation }: { isOpen: boolean; animation: any }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  function navigateSmart(
    target: string,
    params?: object
  ) {
    const state = navigation.getState();
    const { routes, index } = state;

    // If we’re already on it, do nothing
    const current = routes[index];
    if (current?.name === target) return;

    // Look for the target in the current stack
    const targetIndex = routes.findIndex((r) => r.name === target);

    if (targetIndex !== -1 && targetIndex < index) {
      // It exists behind us → pop back to it
      const count = index - targetIndex;
      navigation.dispatch(StackActions.pop(count));
    } else {
      // Not in stack → navigate (push)
      navigation.dispatch(CommonActions.navigate({ name: target, params }));
    }
  }


  const makeItemStyle = (baseDist: number) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateY: -baseDist * animation.value },
        { scale: interpolate(animation.value, [0, 1], [0.8, 1], Extrapolate.CLAMP) },
      ],
      opacity: interpolate(animation.value, [0, 0.2, 1], [0, 0, 1], Extrapolate.CLAMP),
    }));

  const currentRoute = useNavigationState((state) => {
    const getActiveRouteName = (s: any): string => {
      const route = s?.routes?.[s.index ?? 0];
      if (!route) return "";
      if (route.state) return getActiveRouteName(route.state);
      return route.name ?? "";
    };
    return getActiveRouteName(state);
  });

  const ACTIVE_BG = "#f02a4b";
  const ACTIVE_FG = "#ffffff";
  const INACTIVE_BG = "#ffffff";
  const INACTIVE_FG = "#f02a4b";

  // Define buttons in an array
  const buttons = [
    {
      route: Routes.DiscoverScreen,
      icon: ListIcon,
      style: makeItemStyle(baseOffset(3)),
      zIndex: 3,
    },
    {
      route: Routes.DiscoverMapScreen,
      icon: MapIcon,
      style: makeItemStyle(baseOffset(2)),
      zIndex: 2,
    },
    {
      route: Routes.LoginScreen, // change to your actual route
      icon: UserIcon,
      style: makeItemStyle(baseOffset(1)),
      zIndex: 1,
    },
  ];

  return (
    <>
      {buttons.map(({ route, icon: Icon, style, zIndex }) => {
        const isActive = currentRoute === route;
        return (
          <TouchableOpacity
            key={route}
            activeOpacity={0.8}
            pointerEvents={isOpen ? "auto" : "none"}
            onPress={() => navigateSmart(route)}
          >
            <Animated.View
              style={[
                styles.secondaryAbs,
                { zIndex, backgroundColor: isActive ? ACTIVE_BG : INACTIVE_BG },
                style,
              ]}
            >
              <Icon size={24} color={isActive ? ACTIVE_FG : INACTIVE_FG} />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </>
  );
};
