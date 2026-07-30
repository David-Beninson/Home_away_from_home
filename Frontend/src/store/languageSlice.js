import { createSlice } from '@reduxjs/toolkit';
import i18n from '../config/i18n';

const initialState = {
  currentLanguage: localStorage.getItem('i18nextLng') || 'en',
  isLanguageChanging: false,
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage(state, action) {
      state.currentLanguage = action.payload;
    },
    setLanguageChanging(state, action) {
      state.isLanguageChanging = action.payload;
    }
  },
});

export const { setLanguage, setLanguageChanging } = languageSlice.actions;

export const handleLanguageChange = (lang) => (dispatch) => {
  dispatch(setLanguageChanging(true));
  
  // Add a half-second artificial delay so the UI transition isn't harsh
  setTimeout(() => {
    i18n.changeLanguage(lang).then(() => {
      dispatch(setLanguage(lang));
      document.documentElement.dir = i18n.dir(lang);
      document.documentElement.lang = lang;
      dispatch(setLanguageChanging(false));
    });
  }, 500);
};

export default languageSlice.reducer;
