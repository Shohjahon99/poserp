import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.poserp.app',
  appName: 'POS ERP',
  webDir: 'dist',
  server: {
    // Live server — har doim yangi versiya
    url: 'https://www.pos-erp.uz',
    cleartext: false
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  }
};

export default config;
