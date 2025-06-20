import React, { useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import OffChainSlotMachine from './components/OffChainSlotMachine'; // ZMIANA: używamy OffChain komponentu!
import './App.css';

// Telegram WebApp integration
const tg = window.Telegram?.WebApp;

function App() {
  useEffect(() => {
    // Inicjalizacja Telegram WebApp
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Wyłącz ostrzeżenia o nieobsługiwanych funkcjach w Telegram 6.0
      try {
        tg.setHeaderColor('#1a1a1a');
      } catch (e) {
        console.log('Header color not supported in this Telegram version');
      }
      
      try {
        tg.setBackgroundColor('#0f0f0f');
      } catch (e) {
        console.log('Background color not supported in this Telegram version');
      }
      
      // Włącz haptic feedback jeśli dostępny
      if (tg.HapticFeedback) {
        console.log('Haptic feedback available');
      }
      
      console.log('🚀 Telegram WebApp initialized - OFF-CHAIN GAMING MODE');
      console.log('User:', tg.initDataUnsafe?.user);
      console.log('Platform:', tg.platform);
    }

    // Zabezpieczenie przed refresh w Telegram
    const handleBeforeUnload = (e) => {
      if (tg && tg.isExpanded) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Haptic feedback helper (bezpieczny dla Telegram 6.0)
  window.triggerHaptic = (type = 'light') => {
    if (tg?.HapticFeedback) {
      try {
        switch (type) {
          case 'light':
            tg.HapticFeedback.impactOccurred('light');
            break;
          case 'medium':
            tg.HapticFeedback.impactOccurred('medium');
            break;
          case 'heavy':
            tg.HapticFeedback.impactOccurred('heavy');
            break;
          case 'success':
            tg.HapticFeedback.selectionChanged();
            break;
          case 'error':
            tg.HapticFeedback.impactOccurred('heavy');
            break;
          default:
            tg.HapticFeedback.impactOccurred('light');
        }
      } catch (e) {
        // Haptic feedback nie obsługiwany w tej wersji Telegram
        console.log('Haptic feedback not supported');
      }
    }
  };

  return (
    <TonConnectUIProvider 
      manifestUrl="https://ton-slot-direct.vercel.app/tonconnect-manifest.json"
      actionsConfiguration={{
        twaReturnUrl: 'https://t.me/TONSlotMachinebot'
      }}
    >
      <div className="App">
        {/* Header dla aplikacji */}
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">🎰 TON Casino</h1>
            <p className="app-subtitle">⚡ Off-Chain Gaming Experience</p>
            <div style={{
              background: 'rgba(0, 255, 0, 0.1)',
              border: '1px solid rgba(0, 255, 0, 0.3)',
              borderRadius: '20px',
              padding: '8px 16px',
              display: 'inline-block',
              marginTop: '10px'
            }}>
              <span style={{color: '#00ff00', fontSize: '0.9rem', fontWeight: 'bold'}}>
                🚀 UPGRADE: Natychmiastowe spiny!
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="app-main">
          {/* WAŻNE: Używamy OffChainSlotMachine zamiast SlotMachine! */}
          <OffChainSlotMachine />
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <p className="footer-text">
              ⚡ Powered by TON Blockchain
            </p>
            <div className="footer-links">
              <a 
                href="https://testnet.tonscan.org/address/EQDnsPGIUVLsdV5pBww9LNBDGu-61TpojxfnoAc8KYzdk6HR"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                📊 Contract Explorer
              </a>
            </div>
            <p className="footer-disclaimer">
              🔥 Instant spins • 💎 Off-chain gaming • 🚀 Zero waiting • 💰 90% less fees
            </p>
            
            {/* Porównanie modeli */}
            <div style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '10px',
              padding: '15px',
              marginTop: '20px',
              fontSize: '0.9rem'
            }}>
              <strong style={{color: '#ffd700'}}>🔄 Różnica modeli:</strong><br/>
              <span style={{color: '#ff6b6b'}}>❌ Stary (on-chain): Każdy spin = transakcja blockchain</span><br/>
              <span style={{color: '#00ff00'}}>✅ Nowy (off-chain): Spiny natychmiastowe, tylko wpłaty/wypłaty = transakcje</span>
            </div>
          </div>
        </footer>

        {/* Telegram WebApp specific elements */}
        {tg && (
          <div className="telegram-info">
            <div className="telegram-status">
              <span className="status-indicator"></span>
              OFF-CHAIN MODE
            </div>
          </div>
        )}

        {/* Loading overlay for transactions (tylko dla wpłat/wypłat) */}
        <div id="loading-overlay" className="loading-overlay" style={{ display: 'none' }}>
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing blockchain transaction...</p>
            <p style={{fontSize: '0.8rem', opacity: 0.7}}>
              💡 Only deposits/withdrawals use blockchain
            </p>
          </div>
        </div>
      </div>
    </TonConnectUIProvider>
  );
}

export default App;