import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.eventmanagement',
  appName: 'event-management-app',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
