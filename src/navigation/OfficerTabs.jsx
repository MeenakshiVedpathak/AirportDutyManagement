import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../theme/colors';
import OfficerDashboardScreen from '../screens/officer/Dashboard/OfficerDashboardScreen';
import MyDutiesScreen from '../screens/officer/Duties/MyDutiesScreen';
import DutyDetailScreen from '../screens/officer/Duties/DutyDetailScreen';
import ProfileScreen from '../screens/officer/Profile/ProfileScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';

const Tab = createBottomTabNavigator();
const DutyStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const DutiesNavigator = () => (
  <DutyStack.Navigator screenOptions={{headerShown: false}}>
    <DutyStack.Screen name="MyDutiesList" component={MyDutiesScreen} />
    <DutyStack.Screen name="DutyDetail" component={DutyDetailScreen} />
  </DutyStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{headerShown: false}}>
    <ProfileStack.Screen name="OfficerProfile" component={ProfileScreen} />
    <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </ProfileStack.Navigator>
);

const OfficerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {backgroundColor: colors.white, borderTopColor: colors.border, height: 60, paddingBottom: 8},
    }}>
    <Tab.Screen name="Dashboard" component={OfficerDashboardScreen}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text>}} />
    <Tab.Screen name="MyDuties" component={DutiesNavigator}
      options={{tabBarLabel: 'My Duties', tabBarIcon: () => <Text style={{fontSize: 20}}>📋</Text>}} />
    <Tab.Screen name="Profile" component={ProfileNavigator}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>👤</Text>}} />
  </Tab.Navigator>
);

export default OfficerTabs;
