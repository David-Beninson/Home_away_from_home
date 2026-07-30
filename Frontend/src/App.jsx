import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useAppLogic } from './hooks/useAppLogic';
import Loading from './components/Common/Loading/Loading';

export default function App() {
  const { router } = useAppLogic();
  const { i18n } = useTranslation();
  const isLanguageChanging = useSelector((state) => state.language?.isLanguageChanging);

  useEffect(() => {
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <>
      {isLanguageChanging && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loading />
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}