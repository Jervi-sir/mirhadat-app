import { AppState, AppStateStatus, Dimensions, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Routes } from 'utils/variables/routes';

import M1Navigation from './m1/m1-navigation';
import M2Navigation from './m2/m2-navigation';
import M3Navigation from './m3/m3-navigation';
import M4Navigation from './m4/m4-navigation';


const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const TabScreen = [
  { key: 'M1', label: 'Home', routeName: Routes.M1, component: M1Navigation, icon: null },
  { key: 'M2', label: 'Sparks', routeName: Routes.M2, component: M2Navigation, icon: null },
  { key: 'M3', label: 'Archive', routeName: Routes.M3, component: M3Navigation, icon: null },
  { key: 'M4', label: 'Inbox', routeName: Routes.M4, component: M4Navigation, icon: null },
];

const NavigationScreen = () => {

  return (
    <Tab.Navigator
      id={undefined}
      initialRouteName={Routes.M1}
      screenOptions={({ route }) => {
        const isM2 = route.name === Routes.M2;
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: isM2 ? 'white' : 'black',
          tabBarInactiveTintColor: isM2 ? '#cccccc' : 'grey',
          tabBarStyle: {
            backgroundColor: isM2 ? 'black' : '#F5F5F5',
            paddingTop: 3,
            paddingBottom: 3,
            height: 66,
            borderTopWidth: 0,
          },
          tabBarHideOnKeyboard: true,
        };
      }}
    >
      {TabScreen.map((tab) => (
        <Tab.Screen
          key={tab.key}
          name={tab.routeName}
          component={tab.component}
          options={{
            tabBarIconStyle: { width: width / TabScreen.length },
            tabBarItemStyle: { justifyContent: 'center', flex: 1 },
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 5 }}>
                <View style={{ width: 24, height: 24, marginBottom: 1 }}>
                  {/* <tab.icon isActive={focused} color={color} /> */}
                  <Text>1</Text>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: focused ? (tab.routeName !== Routes.M2 ? '#111' : '#fff') : '#707070',
                    textAlign: 'center',
                    fontWeight: 600 as any,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default NavigationScreen;
