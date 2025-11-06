import React, { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

// screens (use your real paths)
import LoginScreen from "./screens/auth/login-screen";
import RegisterScreen from "./screens/auth/register-screen";
import DiscoverScreen from "./screens/discover/discover-screen";
import DiscoverMapScreen from "./screens/discover/discover-map-screen";
import ToiletOfferScreen from "./screens/common/toilet-offer/toilet-offer-screen";

// providers
import { ExternalOpenerProvider } from "./context/external-opener";
import { AuthPromptProvider } from "./context/auth-prompt";

// navigation service (single source of truth)
import { navRef } from "./utils/navigation-service";
import { Routes } from "./utils/variables/routes";
import { useAuthStore } from "./zustand/authStore";

const Stack = createStackNavigator();

function Navigation() {
  return (
    <Stack.Navigator
      screenOptions={{ lazy: true, headerShown: false } as any}
      // initialRouteName={Routes.DiscoverScreen}
    >
      <Stack.Screen name={Routes.DiscoverScreen} component={DiscoverScreen as any} />
      <Stack.Screen name={Routes.RegisterScreen} component={RegisterScreen as any} />
      <Stack.Screen name={Routes.LoginScreen} component={LoginScreen as any} />
      <Stack.Screen name={Routes.ToiletOfferScreen} component={ToiletOfferScreen as any} />
      <Stack.Screen name={Routes.DiscoverMapScreen} component={DiscoverMapScreen as any} />
    </Stack.Navigator>
  );
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  
  useEffect(() => {
    loadFromStorage(); // sets axios header if token exists + hydrates user
  }, [loadFromStorage]);


  // Avoid rendering any screen (that might fire API calls) until fonts (and providers) are ready
  if (!fontsLoaded) return null; // or your splash component

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthPromptProvider>
        <NavigationContainer ref={navRef}>
          <SafeAreaProvider>
            <KeyboardProvider statusBarTranslucent>
              <ExternalOpenerProvider>
                <View style={{ flex: 1 }}>
                  <StatusBar style="auto" />
                  <Navigation />
                </View>
              </ExternalOpenerProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </NavigationContainer>
      </AuthPromptProvider>
    </GestureHandlerRootView>
  );
}
