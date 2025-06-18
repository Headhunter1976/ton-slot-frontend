import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Address, beginCell, toNano } from '@ton/ton';
import { motion, AnimatePresence } from 'framer-motion';
import './SlotMachine.css';

// Opcodes z twojego smart contractu
const OP_CODES = {
  SPIN: 0x7e8764ef,
  DEPOSIT: 0x47d54391,
  WITHDRAW: 0x41836980
};

// Symbole na automatach
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
const SYMBOL_NAMES = {
  '🍒': 'Wiśnia',
  '🍋': 'Cytryna', 
  '🍊': 'Pomarańcza',
  '⭐': 'Gwiazda',
  '💎': 'Diament'
};

// Wypłaty zgodnie z twoim contractem
const PAYOUTS = {
  '💎💎💎': 100, // 100x stawka
  '⭐⭐⭐': 50,  // 50x stawka
  '🍊🍊🍊': 20,  // 20x stawka
  '🍋🍋🍋': 10,  // 10x stawka
  '🍒🍒🍒': 5    // 5x stawka
};

const SlotMachine = ({ contractAddress }) => {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(0.1);
  const [balance, setBalance] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  // Symulacja losowania (w prawdziwej implementacji wynik przychodzi z blockchain)
  const getRandomSymbol = () => {
    const weights = [30, 25, 20, 15, 10]; // Prawdopodobieństwa dla każdego symbolu
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < SYMBOLS.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return SYMBOLS[i];
      }
    }
    return SYMBOLS[0];
  };

  // Animacja kręcenia automatów
  const spinReels = async () => {
    setIsSpinning(true);
    setShowResult(false);
    
    // Dodaj haptic feedback jeśli dostępny
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    // Animacja kręcenia - każdy automat zatrzymuje się w innym momencie
    const spinDurations = [1000, 1500, 2000];
    const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    for (let i = 0; i < spinDurations.length; i++) {
      setTimeout(() => {
        setReels(prev => {
          const newReels = [...prev];
          
          // Kręć automatem przez pewien czas
          const spinInterval = setInterval(() => {
            newReels[i] = getRandomSymbol();
            setReels([...newReels]);
          }, 100);
          
          // Zatrzymaj na finalnym symbolu
          setTimeout(() => {
            clearInterval(spinInterval);
            newReels[i] = finalSymbols[i];
            setReels([...newReels]);
            
            // Jeśli to ostatni automat, sprawdź wynik
            if (i === spinDurations.length - 1) {
              checkResult(finalSymbols);
              setIsSpinning(false);
            }
          }, spinDurations[i] - (i * 200));
        });
      }, i * 200);
    }
  };

  // Sprawdzenie wyniku
  const checkResult = (symbols) => {
    const symbolString = symbols.join('');
    const payout = PAYOUTS[symbolString];
    
    if (payout) {
      const winAmount = betAmount * payout;
      setLastResult({
        type: 'win',
        symbols: symbols,
        payout: payout,
        amount: winAmount,
        symbolName: SYMBOL_NAMES[symbols[0]]
      });
      
      // Haptic feedback dla wygranej
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } else {
      setLastResult({
        type: 'lose',
        symbols: symbols,
        amount: betAmount
      });
      
      // Haptic feedback dla przegranej
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
    
    setShowResult(true);
  };

  // Wysłanie transakcji do smart contractu
  const sendSpinTransaction = async () => {
    if (!userAddress || transactionInProgress) return;
    
    setTransactionInProgress(true);
    
    try {
      // Przygotowanie wiadomości dla smart contractu
      const body = beginCell()
        .storeUint(OP_CODES.SPIN, 32)  // Op code
        .storeUint(Date.now(), 64)     // Random seed
        .endCell();

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // Ważne przez 60 sekund
        messages: [
          {
            address: contractAddress,
            amount: toNano(betAmount).toString(), // Konwersja do nanotonów
            payload: body.toBoc().toString('base64')
          }
        ]
      };

      console.log('Wysyłanie transakcji:', transaction);
      
      // Wysłanie transakcji
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Transakcja wysłana:', result);
      
      // Uruchom animację po wysłaniu transakcji
      await spinReels();
      
    } catch (error) {
      console.error('Błąd transakcji:', error);
      
      // Pokaż błąd użytkownikowi
      setLastResult({
        type: 'error',
        message: 'Transakcja nie powiodła się: ' + error.message
      });
      setShowResult(true);
      
      // Haptic feedback dla błędu
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setTransactionInProgress(false);
    }
  };

  // Pobranie balansu (symulacja - w prawdziwej implementacji z blockchain)
  useEffect(() => {
    if (userAddress) {
      // Tutaj byłoby pobieranie rzeczywistego balansu z blockchain
      setBalance(Math.random() * 10 + 1); // Symulacja balansu 1-11 TON
    }
  }, [userAddress]);

  return (
    <div className="slot-machine">
      {/* Status połączenia */}
      <div className="wallet-status">
        {userAddress ? (
          <div className="connected">
            <p>✅ Połączony portfel</p>
            <p className="address">{userAddress.slice(0, 8)}...{userAddress.slice(-8)}</p>
            <p className="balance">Balans: {balance.toFixed(2)} TON</p>
          </div>
        ) : (
          <div className="not-connected">
            <p>🔒 Podłącz portfel TON aby grać</p>
          </div>
        )}
      </div>

      {/* Automaty */}
      <div className="reels-container">
        <div className="reels">
          {reels.map((symbol, index) => (
            <motion.div
              key={index}
              className={`reel ${isSpinning ? 'spinning' : ''}`}
              animate={isSpinning ? { 
                rotateX: [0, 360],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{ 
                duration: 0.3,
                repeat: isSpinning ? Infinity : 0,
                delay: index * 0.1
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabela wypłat */}
      <div className="payout-table">
        <h3>💰 Tabela wypłat</h3>
        <div className="payouts">
          {Object.entries(PAYOUTS).map(([symbols, multiplier]) => (
            <div key={symbols} className="payout-row">
              <span className="symbols">{symbols}</span>
              <span className="multiplier">{multiplier}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kontrola stawki */}
      <div className="bet-controls">
        <label>Stawka (TON):</label>
        <div className="bet-buttons">
          {[0.01, 0.1, 0.5, 1.0].map(amount => (
            <button
              key={amount}
              className={`bet-button ${betAmount === amount ? 'active' : ''}`}
              onClick={() => setBetAmount(amount)}
              disabled={isSpinning || transactionInProgress}
            >
              {amount} TON
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0.01"
          max="10"
          step="0.01"
          value={betAmount}
          onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0.01)}
          disabled={isSpinning || transactionInProgress}
          className="bet-input"
        />
      </div>

      {/* Przycisk gry */}
      <div className="play-section">
        {userAddress ? (
          <motion.button
            className="spin-button"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={sendSpinTransaction}
            disabled={isSpinning || transactionInProgress || betAmount > balance}
          >
            {transactionInProgress ? (
              <>🔄 Wysyłanie transakcji...</>
            ) : isSpinning ? (
              <>🎰 Kręcę automatami...</>
            ) : (
              <>🎰 ZAGRAJ ({betAmount} TON)</>
            )}
          </motion.button>
        ) : (
          <motion.button
            className="connect-button"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => tonConnectUI.openModal()}
          >
            🔗 Podłącz portfel TON
          </motion.button>
        )}
      </div>

      {/* Wyświetlanie wyniku */}
      <AnimatePresence>
        {showResult && lastResult && (
          <motion.div
            className={`result-popup ${lastResult.type}`}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            {lastResult.type === 'win' ? (
              <div className="win-result">
                <h2>🎉 WYGRANA! 🎉</h2>
                <p className="win-symbols">{lastResult.symbols.join(' ')}</p>
                <p className="win-type">Trzy {lastResult.symbolName}!</p>
                <p className="win-amount">
                  Wygrałeś: <strong>{lastResult.amount.toFixed(3)} TON</strong>
                </p>
                <p className="win-multiplier">({lastResult.payout}x stawka)</p>
              </div>
            ) : lastResult.type === 'lose' ? (
              <div className="lose-result">
                <h2>😔 Przegrana</h2>
                <p className="lose-symbols">{lastResult.symbols.join(' ')}</p>
                <p className="lose-amount">Strata: {lastResult.amount.toFixed(3)} TON</p>
                <p>Spróbuj ponownie!</p>
              </div>
            ) : (
              <div className="error-result">
                <h2>❌ Błąd</h2>
                <p>{lastResult.message}</p>
              </div>
            )}
            
            <button 
              className="close-result"
              onClick={() => setShowResult(false)}
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informacje o grze */}
      <div className="game-info">
        <p>🎯 Minimalna stawka: 0.01 TON</p>
        <p>💎 Maksymalna wygrana: 100x stawka</p>
        <p>⚡ Sieć: TON Testnet</p>
      </div>
    </div>
  );
};

export default SlotMachine;