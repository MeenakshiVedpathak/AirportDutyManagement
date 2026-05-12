import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {enableScreens} from 'react-native-screens';

enableScreens(true);

try {
  const {getMessaging, setBackgroundMessageHandler} = require('@react-native-firebase/messaging');
  setBackgroundMessageHandler(getMessaging(), async () => {});
} catch (e) {
  // Firebase messaging unavailable (e.g. simulator or native bridge not ready)
}

AppRegistry.registerComponent(appName, () => App);
