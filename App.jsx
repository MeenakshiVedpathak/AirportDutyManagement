import React, {useEffect, useRef} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {store, persistor} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StyleSheet, View, ActivityIndicator, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {requestNotificationPermission, setupForegroundNotificationListener} from './src/utils/notificationHandler';

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    store.dispatch({type: 'auth/clearError'});
    store.dispatch({type: 'auth/clearOTPPending'});
    requestNotificationPermission();
    const unsubscribe = setupForegroundNotificationListener(navigationRef);
    return unsubscribe;
  }, []);

   useEffect(() => {
    checkApplicationPermission();
  }, []);

  async function checkApplicationPermission() {
    const authorizationStatus = await messaging().requestPermission();
    if (
      authorizationStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authorizationStatus === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      // 👇 Required for iOS to receive remote notifications
      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
      }
      const fcmToken = await messaging().getToken();
    } else {
      console.log('User has notification permissions disabled');
    }
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Provider store={store}>
        <PersistGate loading={<View style={styles.loading}><ActivityIndicator size="large" color="#1E3A5F" /></View>} persistor={persistor}>
          <AppNavigator navigationRef={navigationRef} />
          <Toast />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F'},
});
