import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {colors} from '../theme/colors';
import AdminDashboardScreen from '../screens/admin/Dashboard/AdminDashboardScreen';
import AllDutiesScreen from '../screens/admin/Duties/AllDutiesScreen';
import CreateDutyScreen from '../screens/admin/Duties/CreateDutyScreen';
import DutyDetailScreen from '../screens/admin/Duties/DutyDetailScreen';
import BoardingPassScanScreen from '../screens/officer/Duties/BoardingPassScanScreen';
import OfficerListScreen from '../screens/admin/Officers/OfficerListScreen';
import AddOfficerScreen from '../screens/admin/Officers/AddOfficerScreen';
import EditOfficerScreen from '../screens/admin/Officers/EditOfficerScreen';
import DutyReportScreen from '../screens/admin/Reports/DutyReportScreen';
import SubordinateReportScreen from '../screens/admin/Reports/SubordinateReportScreen';
import AdminProfileScreen from '../screens/admin/Profile/AdminProfileScreen';
import ChangePasswordScreen from '../screens/shared/ChangePasswordScreen';
import AirportListScreen from '../screens/admin/Airports/AirportListScreen';
import AirportFormScreen from '../screens/admin/Airports/AirportFormScreen';
import TerminalListScreen from '../screens/admin/Airports/TerminalListScreen';
import TerminalFormScreen from '../screens/admin/Airports/TerminalFormScreen';

const Tab = createBottomTabNavigator();
const DutyStack = createNativeStackNavigator();
const OfficerStack = createNativeStackNavigator();
const ReportStack = createNativeStackNavigator();
const AirportStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const DutiesNavigator = () => (
  <DutyStack.Navigator screenOptions={{headerShown: false}}>
    <DutyStack.Screen name="AllDuties" component={AllDutiesScreen} />
    <DutyStack.Screen name="CreateDuty" component={CreateDutyScreen} />
    <DutyStack.Screen name="DutyDetail" component={DutyDetailScreen} />
    <DutyStack.Screen name="BoardingPassScan" component={BoardingPassScanScreen} />
  </DutyStack.Navigator>
);

const OfficersNavigator = () => (
  <OfficerStack.Navigator screenOptions={{headerShown: false}}>
    <OfficerStack.Screen name="OfficerList" component={OfficerListScreen} />
    <OfficerStack.Screen name="AddOfficer" component={AddOfficerScreen} />
    <OfficerStack.Screen name="EditOfficer" component={EditOfficerScreen} />
  </OfficerStack.Navigator>
);

const AirportsNavigator = () => (
  <AirportStack.Navigator screenOptions={{headerShown: false}}>
    <AirportStack.Screen name="AirportList" component={AirportListScreen} />
    <AirportStack.Screen name="AirportForm" component={AirportFormScreen} />
    <AirportStack.Screen name="TerminalList" component={TerminalListScreen} />
    <AirportStack.Screen name="TerminalForm" component={TerminalFormScreen} />
  </AirportStack.Navigator>
);

const ReportsNavigator = () => (
  <ReportStack.Navigator screenOptions={{headerShown: false}}>
    <ReportStack.Screen name="DutyReport" component={DutyReportScreen} />
    <ReportStack.Screen name="SubordinateReport" component={SubordinateReportScreen} />
  </ReportStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{headerShown: false}}>
    <ProfileStack.Screen name="AdminProfile" component={AdminProfileScreen} />
    <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </ProfileStack.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {backgroundColor: colors.white, borderTopColor: colors.border, height: 60, paddingBottom: 8},
    }}>
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>🏠</Text>}} />
    <Tab.Screen name="Duties" component={DutiesNavigator}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>📋</Text>}}
      listeners={({navigation}) => ({
        tabPress: e => {
          e.preventDefault();
          navigation.navigate('Duties', {screen: 'AllDuties'});
        },
      })} />
    <Tab.Screen name="Officers" component={OfficersNavigator}
      options={{tabBarLabel: 'Subordinates', tabBarIcon: () => <Text style={{fontSize: 20}}>👮</Text>}} />
    <Tab.Screen name="Airports" component={AirportsNavigator}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>🛫</Text>}} />
    <Tab.Screen name="Reports" component={ReportsNavigator}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>📊</Text>}} />
    <Tab.Screen name="Profile" component={ProfileNavigator}
      options={{tabBarIcon: () => <Text style={{fontSize: 20}}>👤</Text>}} />
  </Tab.Navigator>
);

export default AdminTabs;
