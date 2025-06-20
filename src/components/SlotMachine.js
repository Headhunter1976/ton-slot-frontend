import React, { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address, toNano, beginCell } from '@ton/ton';
import './SlotMachine.css';

const CONTRACT_ADDRESS = 'EQDnsPGIUVLsdV5pBww9LNBDGu-61TpojxfnoAc8KYzdk6HR';

const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
const SYMBOL_WEIGHTS = [40, 30, 20, 8, 2];

const PAYOUTS = {
  '🍒🍒🍒': 2,
  '🍋🍋🍋': 3,
  '🍊🍊🍊': 5,
  '⭐⭐⭐': 10,
  '💎💎💎': 50,
  '🍒🍒': 1.5,
  '🍋🍋': 2,
  '🍊🍊': 3,
  '⭐⭐': 5,
  '💎💎': 20
};

function SlotMachine() {
  const [tonConnectUI] = useTonConnectUI();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(0.01);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [lastResult, setLastResult] = useState('');
  const [lastWin, setLastWin] = useState(0);

  useEffect(() => {
    const checkConnection = () => {
      setConnected(tonConnectUI.connected);
    };

    checkConnection();
    tonConnectUI.onStatusChange(checkConnection);

    return () => {
      tonConnectUI.onStatusChange(() => {});
    };
  }, [tonConnectUI]);

  const connectWallet = async () => {
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const getRandomSymbol = () => {
    const random = Math.random() * 100;
    let weightSum = 0;
    
    for (let i = 0; i < SYMBOLS.length; i++) {
      weightSum += SYMBOL_WEIGHTS[i];
      if (random <= weightSum) {
        return SYMBOLS[i];
      }
    }
    return SYMBOLS[0];
  };

  const checkWin = (symbols) => {
    const symbolString = symbols.join('');
    
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      return PAYOUTS[symbolString] || 0;
    }
    
    const firstTwo = symbols.slice(0, 2).join('');
    if (symbols[0] === symbols[1] && PAYOUTS[firstTwo]) {
      return PAYOUTS[firstTwo];
    }
    
    return 0;
  };

  const spinReels = async () => {
    if (!connected) {
      alert('Najpierw podłącz portfel!');
      return;
    }

    setSpinning(true);
    setLoading(true);
    setLastResult('');
    setLastWin(0);

    try {
      // Haptic feedback jeśli dostępny
      if (window.triggerHaptic) {
        window.triggerHaptic('medium');
      }

      // Animacja spinowania
      const spinDuration = 2000;
      const spinInterval = 100;
      let elapsed = 0;

      const spinAnimation = setInterval(() => {
        setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
        elapsed += spinInterval;

        if (elapsed >= spinDuration) {
          clearInterval(spinAnimation);
          
          const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
          setReels(finalSymbols);
          
          const multiplier = checkWin(finalSymbols);
          const winAmount = betAmount * multiplier;
          setLastWin(winAmount);

          if (winAmount > 0) {
            setLastResult(`Wygrana: ${winAmount.toFixed(3)} TON! (${multiplier}x)`);
            if (window.triggerHaptic) {
              window.triggerHaptic('success');
            }
          } else {
            setLastResult('Brak wygranej. Spróbuj ponownie!');
          }
          
          setSpinning(false);
          
          // Wyślij transakcję do contractu
          sendSpinTransaction(finalSymbols, winAmount);
        }
      }, spinInterval);

    } catch (error) {
      console.error('Spin error:', error);
      setLastResult('Błąd podczas gry!');
      setSpinning(false);
      setLoading(false);
    }
  };

  const sendSpinTransaction = async (symbols, winAmount) => {
    try {
      // Bezpieczne tworzenie adresu z walidacją
      let contractAddress;
      try {
        contractAddress = Address.parse(CONTRACT_ADDRESS);
      } catch (addrError) {
        console.error('Invalid contract address:', addrError);
        setLoading(false);
        return;
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: contractAddress.toString(), // Bezpieczne wywołanie toString()
            amount: toNano(betAmount).toString(),
            payload: beginCell()
              .storeUint(0x7e8764ef, 32) // op::spin
              .storeUint(0, 64) // query_id
              .storeCoins(toNano(betAmount))
              .storeUint(symbols.map(s => SYMBOLS.indexOf(s)).reduce((a, b) => a * 10 + b, 0), 32)
              .endCell()
              .toBoc()
              .toString('base64')
          }
        ]
      };

      console.log('Sending transaction:', transaction);
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transaction result:', result);
      
      setLastResult(lastResult + ' (Transakcja wysłana!)');
      
      if (window.triggerHaptic) {
        window.triggerHaptic('success');
      }

    } catch (error) {
      console.error('Transaction error:', error);
      setLastResult(lastResult + ' (Błąd transakcji)');
      
      if (window.triggerHaptic) {
        window.triggerHaptic('error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slot-machine-container">
      <div className="slot-machine">
        <h1>🎰 TON Slot Machine</h1>
        <p className="subtitle">Zagraj i wygraj TON!</p>

        {!connected ? (
          <div className="connect-section">
            <p>Podłącz portfel TON, aby rozpocząć grę</p>
            <button onClick={connectWallet} className="connect-button">
              Podłącz Portfel
            </button>
          </div>
        ) : (
          <div className="game-section">
            <div className="reels-container">
              {reels.map((symbol, index) => (
                <div key={index} className={`reel ${spinning ? 'spinning' : ''}`}>
                  <div className="symbol">{symbol}</div>
                </div>
              ))}
            </div>

            {lastResult && (
              <div className={`result ${lastWin > 0 ? 'win' : 'lose'}`}>
                {lastResult}
              </div>
            )}

            <div className="bet-controls">
              <label>
                Stawka: {betAmount} TON
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                  disabled={spinning || loading}
                />
              </label>
            </div>

            <button
              onClick={spinReels}
              disabled={spinning || loading}
              className={`spin-button ${spinning ? 'spinning' : ''}`}
            >
              {loading ? '⏳ WYSYŁANIE...' : spinning ? '🎰 SPINUJE...' : '🎰 ZAGRAJ'}
            </button>

            {loading && (
              <div className="loading-info">
                <p>Czekaj na potwierdzenie transakcji blockchain...</p>
                <div className="loading-spinner"></div>
              </div>
            )}
          </div>
        )}

        {/* Tabela wypłat */}
        <div className="payouts-table">
          <h3>💰 Tabela wypłat</h3>
          <div className="payouts-grid">
            {Object.entries(PAYOUTS).map(([symbols, multiplier]) => (
              <div key={symbols} className="payout-row">
                <span>{symbols}</span>
                <span>{multiplier}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status połączenia */}
        <div className="connection-status">
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Portfel podłączony' : '🔴 Portfel niepodłączony'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SlotMachine;