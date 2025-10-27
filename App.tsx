
import React, { useState, useEffect, useCallback } from 'react';
import type { TokenResponse, GoogleIdentityServicesClient, IdConfiguration } from 'google-one-tap';
import { GOOGLE_CLIENT_ID, SCOPES, DEMO_MODE } from './constants';
import { useLocalization } from './hooks/useLocalization';
import BookingView from './components/BookingView';
import ManageView from './components/ManageView';
import AdminPanel from './components/AdminPanel';
import { CalendarIcon, CogIcon, UserIcon } from './components/icons';
import type { View } from './types';

// Declare the google object from the script tag
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: IdConfiguration) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: TokenResponse) => void;
          }) => GoogleIdentityServicesClient;
        };
      };
    };
  }
}

const App: React.FC = () => {
  const [view, setView] = useState<View>('book');
  const [tokenClient, setTokenClient] = useState<GoogleIdentityServicesClient | null>(null);
  const [gapiToken, setGapiToken] = useState<Omit<TokenResponse, 'error' | 'error_description' | 'error_uri'> | null>(null);
  const [isGisLoaded, setIsGisLoaded] = useState(false);
  const { language, setLanguage, t } = useLocalization();

  const handleGisLoad = useCallback(() => {
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google Auth Error:', tokenResponse.error);
            return;
          }
          setGapiToken(tokenResponse);
        },
      });
      setTokenClient(client);
      setIsGisLoaded(true);
    }
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = handleGisLoad;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [handleGisLoad]);

  const requestToken = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      alert(t('googleAuthError'));
    }
  };
  
  const isAuthenticated = !!gapiToken || DEMO_MODE;

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-bold text-teal-600">GINA PHYSIO</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLanguage(language === 'es' ? 'ca' : 'es')}
                className="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors"
                aria-label={t('toggleLanguage')}
              >
                {language === 'es' ? 'CA' : 'ES'}
              </button>
               {!isAuthenticated && !DEMO_MODE && isGisLoaded && (
                <button
                  onClick={requestToken}
                  className="px-3 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  {t('signInWithGoogle')}
                </button>
              )}
               {DEMO_MODE && (
                <span className="px-3 py-2 bg-amber-500 text-white rounded-md text-sm font-medium">
                  {t('demoMode')}
                </span>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex flex-wrap border-b border-gray-200 mb-6">
            <button
              onClick={() => setView('book')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium ${view === 'book' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon />
              <span>{t('bookAppointment')}</span>
            </button>
            <button
              onClick={() => setView('manage')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium ${view === 'manage' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CogIcon />
              <span>{t('manageAppointment')}</span>
            </button>
            <button
              onClick={() => setView('admin')}
              className={`flex items-center space-x-2 px-4 py-3 font-medium ${view === 'admin' ? 'border-b-2 border-teal-600 text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <UserIcon />
              <span>{t('adminPanel')}</span>
            </button>
          </div>

          <div>
            {view === 'book' && <BookingView token={gapiToken?.access_token} requestToken={requestToken} isAuthenticated={isAuthenticated} />}
            {view === 'manage' && <ManageView token={gapiToken?.access_token} requestToken={requestToken} isAuthenticated={isAuthenticated} />}
            {view === 'admin' && <AdminPanel token={gapiToken?.access_token} requestToken={requestToken} isAuthenticated={isAuthenticated} />}
          </div>
        </div>
      </main>

       <footer className="text-center p-4 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Gina Physio Booking. {t('allRightsReserved')}</p>
        <p className="mt-1">{t('clientIdInfo')}</p>
      </footer>
    </div>
  );
};

export default App;
