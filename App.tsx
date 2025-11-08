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
import DiscoverScreen from "./screens/m1/discover-screen";
import DiscoverMapScreen from "./screens/m2/discover-map-screen";
import ToiletOfferScreen from "./screens/common/toilet-offer/toilet-offer-screen";

// providers
import { ExternalOpenerProvider } from "./context/external-opener";
import { AuthPromptProvider } from "./context/auth-prompt";

// navigation service (single source of truth)
import { navRef } from "./utils/navigation-service";
import { Routes } from "./utils/variables/routes";
import ToiletFormScreen from "./screens/common/toilet-form/toilet-form-screen";
import HostDashboardScreen from "./screens/m4/host-dashboard-screen";
import MapPickerScreen from "./screens/common/toilet-form/map-picker-screen";
import NavigationScreen from "./screens/navigation-screen";
import BootScreen from "./screens/boot-screen";
import EditProfileScreen from "./screens/m4/edit-profile-screen";

const Stack = createStackNavigator();

function Navigation() {
  // return <DemoUI />
  return (
    <Stack.Navigator
      screenOptions={{ lazy: true, headerShown: false } as any}
      initialRouteName={Routes.BootScreen}
    >
      <Stack.Screen name={Routes.BootScreen} component={BootScreen as any} />
      <Stack.Screen
        name={Routes.NavigationScreen}
        component={NavigationScreen as any}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen name={Routes.DiscoverScreen} component={DiscoverScreen as any} />
      <Stack.Screen name={Routes.ToiletOfferScreen} component={ToiletOfferScreen as any} />
      <Stack.Screen name={Routes.DiscoverMapScreen} component={DiscoverMapScreen as any} />
      <Stack.Screen name={Routes.ToiletFormScreen} component={ToiletFormScreen as any} />
      <Stack.Screen name={Routes.HostDashboardScreen} component={HostDashboardScreen as any} />
      <Stack.Screen name={Routes.MapPickerScreen} component={MapPickerScreen as any} />
      <Stack.Screen name={Routes.EditProfileScreen} component={EditProfileScreen as any} />
      
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  
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
