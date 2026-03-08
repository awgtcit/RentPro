// API configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure these values for your environment:
// - DEV: Use your machine's LAN IP (run `ipconfig` / `ifconfig` to find it)
// - PROD: Use your server's domain with HTTPS
const API_CONFIG = {
  dev: { host: '192.168.0.10', port: 5000, protocol: 'http' as const },
  prod: { host: '192.168.0.10', port: 5000, protocol: 'https' as const },
};

const isDev = __DEV__;
const env = isDev ? API_CONFIG.dev : API_CONFIG.prod;

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  // Android emulator uses special IP to reach host machine
  const isEmulator = !Constants.isDevice;
  if (Platform.OS === 'android' && isEmulator) {
    return 'http://10.0.2.2:5000/api';
  }
  // Real device (Android/iOS) — use configured host
  return `${env.protocol}://${env.host}:${env.port}/api`;
};

export const API_BASE_URL = getBaseUrl();
export const APP_NAME = 'RentPro';
export const APP_VERSION = '1.0.0';
