// Use require() so LogBox is configured before App (and its deps) load.
// ES6 imports are hoisted — require() is not.
const {AppRegistry, LogBox} = require('react-native');

// Suppress ALL dev-mode warnings/errors in LogBox.
// RN 0.83 + New Architecture generates many false-positive console.errors
// from legacy bridge compatibility shims in third-party libraries.
LogBox.ignoreAllLogs();

const App = require('./App').default;
const {name: appName} = require('./app.json');

try {
  const {getMessaging, setBackgroundMessageHandler} = require('@react-native-firebase/messaging');
  setBackgroundMessageHandler(getMessaging(), async () => {});
} catch (e) {
  // Firebase messaging unavailable (e.g. simulator or native bridge not ready)
}

AppRegistry.registerComponent(appName, () => App);
