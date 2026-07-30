import { configureStore } from '@reduxjs/toolkit';
import requestsReducer from './requestsSlice';
import authReducer from './authSlice';
import availabilityReducer from './availabilitySlice';
import chatReducer from './chatSlice';
import statsReducer from './statsSlice';
import notificationsReducer from './notificationsSlice';
import languageReducer from './languageSlice';

export const store = configureStore({
  reducer: {
    requests: requestsReducer,
    auth: authReducer,
    availability: availabilityReducer,
    chat: chatReducer,
    stats: statsReducer,
    notifications: notificationsReducer,
    language: languageReducer,
  },
});

