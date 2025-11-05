import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import LoginScreen from './screens/auth/login-screen';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useEffect } from 'react';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { Routes } from './utils/variables/routes';
import RegisterScreen from './screens/auth/register-screen';
import MapScreen from './screens/discover/deprecated/map-screen';
import DiscoverScreen from './screens/discover/discover-screen';
import ToiletListItemExample from './screens/toilet-list-item-screen';
import ToiletOfferScreen from './screens/common/toilet-offer/toilet-offer-screen';
import DiscoverMapScreen from './screens/discover/discover-map-screen';

export default function App() {
    const navigationRef = useNavigationContainerRef();

      useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      console.log('Navigation state changed:', navigationRef.getCurrentRoute());
    });
    return unsubscribe;
  }, [navigationRef]);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <SafeAreaProvider>
          <KeyboardProvider statusBarTranslucent>
            <>
              <Navigation />
            </>
          </KeyboardProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const Stack = createStackNavigator();

const Navigation = () => {
  return (
    <>
      <Stack.Navigator
        id={undefined}
        screenOptions={{
          lazy: true,
          headerShown: false,
          // gestureDirection: 'horizontal',
          // ...TransitionPresets.SlideFromRightIOS
        } as any}
        // initialRouteName={Routes.BootScreen}
      >
        {
          [
            /**-- auth --*/
            { name: Routes.DiscoverScreen, component: DiscoverScreen },
            { name: Routes.RegisterScreen, component: RegisterScreen },
            { name: Routes.LoginScreen, component: LoginScreen },
            { name: Routes.ToiletOfferScreen, component: ToiletOfferScreen },
            { name: Routes.DiscoverMapScreen, component: DiscoverMapScreen },

            
            // { name: Routes.BootScreen, component: BootScreen },

          ].map((item, index) => (
            <Stack.Screen
              key={index}
              name={item.name}
              // TODO: CHeck where there is an error when i dont use any
              component={item.component as any}
            // options={
            //   item.modal
            //     ? {
            //       presentation: 'modal',
            //       // animation: 'slide_from_bottom',
            //       headerShown: false,
            //       // contentStyle: { backgroundColor: 'transparent' },
            //     }
            //     :
            //     {
            //       ...TransitionPresets.SlideFromRightIOS
            //     }
            // }
            />
          ))
        }

      </Stack.Navigator>
    </>
  )
}


