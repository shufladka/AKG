// @ts-nocheck
import { createApp } from 'vue';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import App from '@/App.vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import router from '@/utils/router';
import logger from '@/plugins/logger';
import '@/assets/styles.scss';
import '@/assets/input.css'

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBUhPPbTN-vkPi_-8iLxR79jq4ftnQYKj0",
  authDomain: "akg-dist.firebaseapp.com",
  projectId: "akg-dist",
  storageBucket: "akg-dist.firebasestorage.app",
  messagingSenderId: "521987870165",
  appId: "1:521987870165:web:2f2c4a15839154534d015c",
  measurementId: "G-6SEQFY14PM"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);

const app = createApp(App);
app.use(router);
app.use(createPinia());
app.use(logger);
app.use(analytics)
app.mount('#app');
