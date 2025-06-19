import React, { useState, useEffect } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { beginCell, toNano } from '@ton/ton';
import { motion, AnimatePresence } from 'framer-motion';
import './SlotMachine.css';

// Opcodes z twojego smart contractu
const OP_CODES = {
  SPIN: 0x7e8764ef,
  DEPOSIT: 0x47d54391,
  WITHDRAW: 0x41836980
};

// Symbole i wypłaty
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
const PAYOUTS = {
  '💎💎💎': 100,
  '⭐⭐⭐': 50,
  '🍊🍊🍊': 20,
  '🍋🍋🍋': 10,
  '🍒🍒🍒': 5
};

const SlotMachine = ({ contractAddress }) => {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(0.1);
  const [balance, setBalance] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  // Telegram WebApp
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      console.log('📱 Telegram WebApp zainicjalizowany');
    }
  }, [tg]);

  // Debug - sprawdź biblioteki
  useEffect(() => {
    console.log('🔧 TON biblioteki status:');
    console.log('- beginCell:', typeof beginCell !== 'undefined');
    console.log('- toNano:', typeof toNano !== 'undefined');
    console.log('- Buffer (global):', typeof window.Buffer !== 'undefined');
    console.log('- Process (global):', typeof window.process !== 'undefined');
  }, []);

  const getRandomSymbol = () => {
    const weights = [30, 25, 20, 15, 10];
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

  const spinReels = async () => {
    setIsSpinning(true);
    setShowResult(false);
    
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    const spinDurations = [1000, 1500, 2000];
    const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    for (let i = 0; i < spinDurations.length; i++) {
      setTimeout(() => {
        setReels(prev => {
          const newReels = [...prev];
          
          const spinInterval = setInterval(() => {
            newReels[i] = getRandomSymbol();
            setReels([...newReels]);
          }, 100);
          
          setTimeout(() => {
            clearInterval(spinInterval);
            newReels[i] = finalSymbols[i];
            setReels([...newReels]);
            
            if (i === spinDurations.length - 1) {
              checkResult(finalSymbols);
              setIsSpinning(false);
            }
          }, spinDurations[i] - (i * 200));
        });
      }, i * 200);
    }
  };

  const checkResult = (symbols) => {
    const symbolString = symbols.join('');
    const payout = PAYOUTS[symbolString];
    
    if (payout) {
      setLastResult({
        type: 'win',
        symbols: symbols,
        payout: payout,
        amount: betAmount * payout
      });
      
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
    } else {
      setLastResult({
        type: 'lose',
        symbols: symbols,
        amount: betAmount
      });
      
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    }
    
    setShowResult(true);
  };

  const sendSpinTransaction = async () => {
    if (!userAddress || transactionInProgress) return;
    
    setTransactionInProgress(true);
    
    try {
      console.log('🔄 Tworzenie transakcji...');
      
      // Sprawdź czy TON biblioteki działają
      if (typeof beginCell === 'undefined' || typeof toNano === 'undefined') {
        throw new Error('TON biblioteki nie są załadowane');
      }
      
      const body = beginCell()
        .storeUint(OP_CODES.SPIN, 32)
        .storeUint(Date.now(), 64)
        .endCell();

      const amountInNano = toNano(betAmount);
      console.log(`💰 Stawka: ${betAmount} TON = ${amountInNano} nanoTON`);

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: contractAddress,
            amount: amountInNano.toString(),
            payload: body.toBoc().toString('base64')
          }
        ]
      };

      console.log('📤 Wysyłanie transakcji:', transaction);
      
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('✅ Transakcja wysłana:', result);
      
      await spinReels();
      
    } catch (error) {
      console.error('❌ Błąd transakcji:', error);
      
      let errorMessage = 'Nieznany błąd';
      if (error.message.includes('User rejected')) {
        errorMessage = 'Transakcja odrzucona przez użytkownika';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Niewystarczające środki';
      } else if (error.message.includes('network')) {
        errorMessage = 'Problem z siecią';
      } else {
        errorMessage = error.message;
      }
      
      setLastResult({
        type: 'error',
        message: errorMessage
      });
      setShowResult(true);
      
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setTransactionInProgress(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      setBalance(Math.random() * 10 + 1);
      console.log(`💼 Symulowany balans dla ${userAddress.slice(0, 8)}...`);
    }
  }, [userAddress]);

  return (
    <div className="slot-machine">
      {/* Debug info */}
      <div className="debug-info" style={{
        fontSize: '0.8em', 
        padding: '10px', 
        background: 'rgba(0,0,0,0.1)', 
        borderRadius: '5px', 
        marginBottom: '15px'
      }}>
        <p>🔧 Buffer: {typeof window.Buffer !== 'undefined' ? '✅' : '❌'}</p>
        <p>🔧 Process: {typeof window.process !== 'undefined' ? '✅' : '❌'}</p>
        <p>🔧 TON: {typeof beginCell !== 'undefined' ? '✅' : '❌'}</p>
        <p>📱 Telegram: {tg ? '✅' : '❌'}</p>
        <p>🔗 Portfel: {userAddress ? '✅' : '❌'}</p>
      </div>

      {/* Status portfela */}
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
  {(reels || ['🍒', '🍒', '🍒']).map((symbol, index) => (
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
          {Object.entries(PAYOUTS || {}).map(([symbols, multiplier]) => (
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
      </div>

      {/* Przycisk gry */}
      <div className="play-section">
        {userAddress ? (
          <motion.button
            className="spin-button"
            whileTap={{ scale: 0.95 }}
            onClick={sendSpinTransaction}
            disabled={isSpinning || transactionInProgress || betAmount > balance}
          >
            {transactionInProgress ? (
              <>🔄 Wysyłanie...</>
            ) : isSpinning ? (
              <>🎰 Kręcę...</>
            ) : (
              <>🎰 ZAGRAJ ({betAmount} TON)</>
            )}
          </motion.button>
        ) : (
          <motion.button
            className="connect-button"
            onClick={() => tonConnectUI.openModal()}
          >
            🔗 Podłącz portfel TON
          </motion.button>
        )}
      </div>

      {/* Wyniki */}
      <AnimatePresence>
        {showResult && lastResult && (
          <motion.div
            className={`result-popup ${lastResult.type}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {lastResult.type === 'win' ? (
              <div className="win-result">
                <h2>🎉 WYGRANA! 🎉</h2>
                <p className="win-symbols">{lastResult.symbols.join(' ')}</p>
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
              </div>
            ) : (
              <div className="error-result">
                <h2>❌ Błąd</h2>
                <p>{lastResult.message}</p>
              </div>
            )}
            
            <button onClick={() => setShowResult(false)}>OK</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Informacje */}
      <div className="game-info">
        <p>🎯 Minimalna stawka: 0.01 TON</p>
        <p>💎 Maksymalna wygrana: 100x stawka</p>
        <p>⚡ Sieć: TON Testnet</p>
        <p>📍 Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-8)}</p>
      </div>
    </div>
  );
};

export default SlotMachine;