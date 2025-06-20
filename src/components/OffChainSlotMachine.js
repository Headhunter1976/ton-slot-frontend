import React, { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address, toNano, beginCell } from '@ton/ton';
import './SlotMachine.css';

const CONTRACT_ADDRESS = 'EQDnsPGIUVLsdV5pBww9LNBDGu-61TpojxfnoAc8KYzdk6HR';

const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
const SYMBOL_WEIGHTS = [40, 30, 20, 8, 2]; // Prawdopodobieństwa w %

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

function OffChainSlotMachine() {
  const [tonConnectUI] = useTonConnectUI();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(0.01);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [lastResult, setLastResult] = useState('');
  const [lastWin, setLastWin] = useState(0);
  
  // BALANSY - to jest kluczowe!
  const [localBalance, setLocalBalance] = useState(1.0); // Startowy balans do testowania
  const [blockchainBalance, setBlockchainBalance] = useState(0); // Na kontrakcie
  
  // STATYSTYKI SESJI
  const [sessionStats, setSessionStats] = useState({
    spins: 0,
    totalBet: 0,
    totalWon: 0,
    biggestWin: 0,
    profit: 0
  });

  // MODALS
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0.1);
  const [withdrawAmount, setWithdrawAmount] = useState(0);

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
    
    // Sprawdź wszystkie 3 symbole
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
      return PAYOUTS[symbolString] || 0;
    }
    
    // Sprawdź pierwsze 2 symbole
    const firstTwo = symbols.slice(0, 2).join('');
    if (symbols[0] === symbols[1] && PAYOUTS[firstTwo]) {
      return PAYOUTS[firstTwo];
    }
    
    return 0;
  };

  // 🎰 NATYCHMIASTOWY SPIN (BEZ TRANSAKCJI!)
  const spinReels = async () => {
    if (localBalance < betAmount) {
      alert(`Niewystarczający balans! Masz ${localBalance.toFixed(3)} TON, potrzebujesz ${betAmount} TON. Wpłać więcej środków.`);
      return;
    }

    setSpinning(true);
    setLastResult('');
    setLastWin(0);

    // Haptic feedback jeśli dostępny
    if (window.triggerHaptic) {
      window.triggerHaptic('medium');
    }

    console.log('🎰 OFF-CHAIN SPIN - Brak transakcji blockchain!');

    // Animacja spinowania (2 sekundy)
    const spinDuration = 2000;
    const spinInterval = 100;
    let elapsed = 0;

    const spinAnimation = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
      elapsed += spinInterval;

      if (elapsed >= spinDuration) {
        clearInterval(spinAnimation);
        
        // Finalne symbole
        const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        setReels(finalSymbols);
        
        // Sprawdź wygraną
        const multiplier = checkWin(finalSymbols);
        const winAmount = betAmount * multiplier;
        
        // AKTUALIZUJ LOKALNY BALANS (bez blockchain!)
        const newLocalBalance = localBalance - betAmount + winAmount;
        setLocalBalance(newLocalBalance);
        setLastWin(winAmount);
        
        // Aktualizuj statystyki sesji
        const newProfit = sessionStats.profit - betAmount + winAmount;
        setSessionStats(prev => ({
          spins: prev.spins + 1,
          totalBet: prev.totalBet + betAmount,
          totalWon: prev.totalWon + winAmount,
          biggestWin: Math.max(prev.biggestWin, winAmount),
          profit: newProfit
        }));

        if (winAmount > 0) {
          setLastResult(`🎉 WYGRANA: ${winAmount.toFixed(3)} TON! (${multiplier}x)`);
          if (window.triggerHaptic) {
            window.triggerHaptic('success');
          }
        } else {
          setLastResult('😔 Brak wygranej. Spróbuj ponownie!');
        }
        
        console.log(`💰 Lokalny balans: ${newLocalBalance.toFixed(3)} TON (${winAmount > 0 ? '+' : ''}${(winAmount - betAmount).toFixed(3)} TON)`);
        
        setSpinning(false);
      }
    }, spinInterval);
  };

  // 💳 WPŁATA NA KONTRAKT (jedyna transakcja blockchain)
  const depositToContract = async () => {
    if (!connected) {
      alert('Najpierw podłącz portfel!');
      return;
    }

    setLoading(true);
    try {
      console.log(`💳 DEPOSIT: Wpłacanie ${depositAmount} TON na kontrakt...`);
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano(depositAmount).toString(),
            payload: beginCell()
              .storeUint(0x47d54391, 32) // op::deposit
              .endCell()
              .toBoc()
              .toString('base64')
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      
      // Symuluj aktualizację balansów
      setLocalBalance(prev => prev + depositAmount);
      setBlockchainBalance(prev => prev + depositAmount);
      setShowDepositModal(false);
      
      alert(`✅ Wpłacono ${depositAmount} TON! Możesz teraz grać.`);
      console.log(`✅ Wpłata zakończona. Nowy lokalny balans: ${(localBalance + depositAmount).toFixed(3)} TON`);
      
    } catch (error) {
      console.error('❌ Błąd wpłaty:', error);
      alert('❌ Błąd wpłaty!');
    } finally {
      setLoading(false);
    }
  };

  // 💰 WYPŁATA Z KONTRAKTU
  const withdrawFromContract = async () => {
    if (!connected) {
      alert('Najpierw podłącz portfel!');
      return;
    }

    if (withdrawAmount > localBalance) {
      alert('Nie możesz wypłacić więcej niż masz!');
      return;
    }

    setLoading(true);
    try {
      console.log(`💰 WITHDRAW: Wypłacanie ${withdrawAmount} TON z kontraktu...`);
      
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: CONTRACT_ADDRESS,
            amount: toNano(0.05).toString(), // Gas fee
            payload: beginCell()
              .storeUint(0x41836980, 32) // op::withdraw
              .storeCoins(toNano(withdrawAmount))
              .endCell()
              .toBoc()
              .toString('base64')
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      
      // Aktualizuj balansy
      setLocalBalance(prev => prev - withdrawAmount);
      setBlockchainBalance(prev => prev - withdrawAmount);
      setShowWithdrawModal(false);
      
      alert(`✅ Wypłacono ${withdrawAmount} TON!`);
      console.log(`✅ Wypłata zakończona. Nowy lokalny balans: ${(localBalance - withdrawAmount).toFixed(3)} TON`);
      
    } catch (error) {
      console.error('❌ Błąd wypłaty:', error);
      alert('❌ Błąd wypłaty!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slot-machine-container">
      <div className="slot-machine">
        <h1>🎰 TON Slot Machine</h1>
        <p className="subtitle">⚡ Off-Chain Gaming - Natychmiastowe spiny!</p>

        {/* SEKCJA BALANSÓW */}
        <div className="balance-section">
          <div className="balance-item">
            <span className="balance-label">💰 Balans do gry:</span>
            <span className="balance-value">{localBalance.toFixed(3)} TON</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">🔗 Na kontrakcie:</span>
            <span className="balance-value">{blockchainBalance.toFixed(3)} TON</span>
          </div>
        </div>

        {/* STATYSTYKI SESJI */}
        <div className="stats-section">
          <h3>📊 Statystyki sesji</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Spiny:</span>
              <span className="stat-value">{sessionStats.spins}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Postawiono:</span>
              <span className="stat-value">{sessionStats.totalBet.toFixed(3)} TON</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Wygrane:</span>
              <span className="stat-value">{sessionStats.totalWon.toFixed(3)} TON</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Zysk/Strata:</span>
              <span className={`stat-value ${sessionStats.profit >= 0 ? 'profit' : 'loss'}`}>
                {sessionStats.profit >= 0 ? '+' : ''}{sessionStats.profit.toFixed(3)} TON
              </span>
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="connect-section">
            <p>Podłącz portfel TON, aby wpłacić środki</p>
            <button onClick={connectWallet} className="connect-button">
              Podłącz Portfel
            </button>
            <p style={{color: '#ffd700', fontSize: '0.9rem', marginTop: '10px'}}>
              💡 Możesz grać na balansie testowym bez portfela!
            </p>
          </div>
        ) : (
          /* KONTROLE ZARZĄDZANIA BALANSEM */
          <div className="balance-controls">
            <button 
              onClick={() => setShowDepositModal(true)}
              className="deposit-button"
              disabled={loading}
            >
              💳 Wpłać TON
            </button>
            <button 
              onClick={() => setShowWithdrawModal(true)}
              className="withdraw-button"
              disabled={loading || localBalance === 0}
            >
              💰 Wypłać TON
            </button>
          </div>
        )}

        {/* SEKCJA GRY */}
        <div className="game-section">
          {/* Bębny */}
          <div className="reels-container">
            {reels.map((symbol, index) => (
              <div key={index} className={`reel ${spinning ? 'spinning' : ''}`}>
                <div className="symbol">{symbol}</div>
              </div>
            ))}
          </div>

          {/* Wynik */}
          {lastResult && (
            <div className={`result ${lastWin > 0 ? 'win' : 'lose'}`}>
              {lastResult}
            </div>
          )}

          {/* Kontrole gry */}
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
                disabled={spinning}
              />
            </label>
          </div>

          <button
            onClick={spinReels}
            disabled={spinning || localBalance < betAmount}
            className={`spin-button ${spinning ? 'spinning' : ''}`}
          >
            {spinning ? '🎰 SPINUJE...' : '🎰 ZAGRAJ NATYCHMIAST'}
          </button>

          {localBalance < betAmount && (
            <p style={{color: '#ff6b6b', textAlign: 'center', marginTop: '10px'}}>
              ⚠️ Za mało środków! Wpłać więcej TON aby grać.
            </p>
          )}
        </div>

        {/* Informacja o off-chain */}
        <div style={{
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '10px',
          padding: '15px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <p style={{color: '#00d4ff', margin: 0, fontSize: '0.9rem'}}>
            ⚡ <strong>OFF-CHAIN GAMING:</strong> Spiny są natychmiastowe i nie wymagają transakcji blockchain!<br/>
            💰 Tylko wpłaty i wypłaty używają blockchainu.
          </p>
        </div>

        {/* Tabela wypłat */}
        <div className="payouts-table">
          <h3>💰 Tabela wypłat</h3>
          <div className="payouts-grid">
            <div className="payout-row">
              <span>💎💎💎</span>
              <span>50x</span>
            </div>
            <div className="payout-row">
              <span>⭐⭐⭐</span>
              <span>10x</span>
            </div>
            <div className="payout-row">
              <span>🍊🍊🍊</span>
              <span>5x</span>
            </div>
            <div className="payout-row">
              <span>🍋🍋🍋</span>
              <span>3x</span>
            </div>
            <div className="payout-row">
              <span>🍒🍒🍒</span>
              <span>2x</span>
            </div>
            <div className="payout-row">
              <span>💎💎</span>
              <span>20x</span>
            </div>
            <div className="payout-row">
              <span>⭐⭐</span>
              <span>5x</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL WPŁATY */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>💳 Wpłać środki</h3>
            <p>Wpłać TON na kontrakt do gry:</p>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              min="0.01"
              step="0.01"
              placeholder="Kwota w TON"
            />
            <div className="modal-buttons">
              <button onClick={depositToContract} disabled={loading}>
                {loading ? 'Wpłacanie...' : 'Wpłać'}
              </button>
              <button onClick={() => setShowDepositModal(false)}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WYPŁATY */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>💰 Wypłać środki</h3>
            <p>Dostępne do wypłaty: {localBalance.toFixed(3)} TON</p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
              min="0.01"
              max={localBalance}
              step="0.01"
              placeholder="Kwota w TON"
            />
            <div className="modal-buttons">
              <button onClick={withdrawFromContract} disabled={loading}>
                {loading ? 'Wypłacanie...' : 'Wypłać'}
              </button>
              <button onClick={() => setShowWithdrawModal(false)}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OffChainSlotMachine;