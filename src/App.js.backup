import React, { useEffect, useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import SlotMachine from './components/SlotMachine';
import './App.css';

// Twój adres smart contractu na testnet
const CONTRACT_ADDRESS = "EQDnsPGIUVLsdV5pBww9LNBDGu-61TpojxfnoAc8KYzdk6HR";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inicjalizacja Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Podstawowa konfiguracja
      tg.ready();
      tg.expand();
      
      // Ustawienie kolorów zgodnych z Telegram
      tg.setHeaderColor('#2481cc');
      tg.setBackgroundColor('#ffffff');
      
      // Włączenie haptic feedback
      if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      }
      
      console.log('Telegram WebApp zainicjalizowany:', tg.initDataUnsafe);
    } else {
      console.log('Aplikacja uruchomiona poza Telegramem - tryb deweloperski');
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🎰</div>
        <p>Ładowanie automatu...</p>
      </div>
    );
  }

  return (
    <TonConnectUIProvider 
      manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}
      enableAndroidBackHandler={true}
    >
      <div className="app">
        <header className="app-header">
          <h1>🎰 TON Slot Machine</h1>
          <p>Zagraj i wygraj TON!</p>
        </header>
        
        <main className="app-main">
          <SlotMachine contractAddress={CONTRACT_ADDRESS} />
        </main>
        
        <footer className="app-footer">
          <p>Powered by TON Blockchain</p>
        </footer>
      </div>
    </TonConnectUIProvider>
  );
}

export default App;