import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  TodayScreen,
  ProjectsScreen,
  InboxScreen,
  SettingsScreen,
  FocusScreen,
} from './screens';
import { colors } from './utils/theme';

// Define navigation types
export type RootStackParamList = {
  Today: undefined;
  Projects: undefined;
  Inbox: undefined;
  Settings: undefined;
  Focus: { taskId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Main App Component
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator
            initialRouteName="Today"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen
              name="Today"
              component={TodayScreen}
              options={{
                title: 'Today',
              }}
            />
            <Stack.Screen
              name="Projects"
              component={ProjectsScreen}
              options={{
                title: 'Projects',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Inbox"
              component={InboxScreen}
              options={{
                title: 'Inbox',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="Focus"
              component={FocusScreen}
              options={{
                title: 'Focus',
                animation: 'fade',
                presentation: 'modal',
                headerShown: true,
                headerTitle: '',
                headerTransparent: true,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
