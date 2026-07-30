import { useState, useEffect } from 'react';
import { portfolioAPI, stockAPI } from '../services/api';
import { FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTrade, setShowTrade] = useState(false);
  const [tradeForm, setTradeForm] = useState({ symbol: '', type: 'buy', quantity: '', price: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await portfolioAPI.get();
      setPortfolio(res?.data || null);
      if (res?.data?.trades?.length > 0) {
        const symbols = [...new Set(res.data.trades.map(t => t.symbol))];
        const q = {};
        await Promise.all(symbols.map(async (sym) => {
          try { const r = await stockAPI.getQuote(sym); q[sym] = r.data; } catch (_) {}
        }));
        setQuotes(q);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addTrade = async (e) => {
    e.preventDefault();
    if (!tradeForm.symbol || !tradeForm.quantity || !tradeForm.price) return toast.error('All fields required');
    try {
      await portfolioAPI.addTrade(tradeForm);
      setShowTrade(false);
      setTradeForm({ symbol: '', type: 'buy', quantity: '', price: '' });
      toast.success('Trade added');
      load();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const removeTrade = async (id) => {
    try {
      await portfolioAPI.removeTrade(id);
      toast.success('Trade removed');
      load();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const reset = async () => {
    if (!window.confirm('Reset portfolio? All trades will be deleted.')) return;
    try {
      await portfolioAPI.reset();
      setPortfolio(null);
      toast.success('Portfolio reset');
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const calcHoldings = () => {
    if (!portfolio?.trades) return { holdings: {}, totalInvested: 0, totalValue: 0, pnl: 0 };
    const buys = {}, sells = {};
    portfolio.trades.forEach(t => {
      if (t.type === 'buy') { buys[t.symbol] = (buys[t.symbol] || 0) + t.quantity; }
      else { sells[t.symbol] = (sells[t.symbol] || 0) + t.quantity; }
    });
    const holdings = {};
    let totalInvested = 0;
    Object.entries(buys).forEach(([sym, qty]) => {
      const sq = sells[sym] || 0;
      const net = qty - sq;
      if (net > 0) {
        const buyTrades = portfolio.trades.filter(t => t.symbol === sym && t.type === 'buy');
        const avgPrice = buyTrades.reduce((s, t) => s + t.price * t.quantity, 0) / buyTrades.reduce((s, t) => s + t.quantity, 0);
        holdings[sym] = { symbol: sym, quantity: net, avgPrice, invested: net * avgPrice };
        totalInvested += net * avgPrice;
      }
    });
    let totalValue = 0;
    Object.values(holdings).forEach(h => {
      const cp = quotes[h.symbol]?.lastPrice || h.avgPrice;
      h.currentPrice = cp;
      h.value = h.quantity * cp;
      h.pnl = h.value - h.invested;
      h.pnlPercent = h.invested ? ((h.pnl / h.invested) * 100) : 0;
      totalValue += h.value;
    });
    return { holdings: Object.values(holdings).sort((a, b) => b.value - a.value), totalInvested, totalValue, pnl: totalValue - totalInvested };
  };

  const { holdings, totalInvested, totalValue, pnl } = calcHoldings();
  const pnlPct = totalInvested ? (pnl / totalInvested) * 100 : 0;

  if (loading) return <div className="page-container"><div className="loading-spinner">Loading portfolio...</div></div>;

  return (
    <div className="page-container">
      <div className="portfolio-header">
        <h1>Virtual Portfolio</h1>
        <div className="portfolio-actions">
          <button className="btn btn-primary" onClick={() => setShowTrade(true)}><FiPlus size={14} /> Add Trade</button>
          {portfolio?.trades?.length > 0 && (
            <button className="btn btn-outline" onClick={reset}><FiTrash2 size={14} /> Reset</button>
          )}
          <button className="btn btn-outline" onClick={load}><FiRefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="portfolio-summary">
        <div className="summary-card"><span className="summary-label">Invested</span><span className="summary-value">₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span></div>
        <div className="summary-card"><span className="summary-label">Current Value</span><span className="summary-value">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span></div>
        <div className="summary-card"><span className="summary-label">P&L</span><span className={`summary-value ${pnl >= 0 ? 'positive' : 'negative'}`}>{pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span></div>
      </div>

      {holdings.length > 0 ? (
        <div className="holdings-table">
          <div className="holdings-header">
            <span>Symbol</span><span>Qty</span><span>Avg Price</span><span>Current</span><span>Value</span><span>P&L</span>
          </div>
          {holdings.map(h => (
            <div key={h.symbol} className="holdings-row">
              <span className="holding-sym">{h.symbol}</span>
              <span>{h.quantity}</span>
              <span>₹{h.avgPrice.toFixed(2)}</span>
              <span>₹{h.currentPrice.toFixed(2)}</span>
              <span>₹{h.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              <span className={h.pnl >= 0 ? 'positive' : 'negative'}>{h.pnl >= 0 ? '+' : ''}₹{h.pnl.toFixed(2)} ({h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%)</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No holdings. Add a trade to start tracking your virtual portfolio.</div>
      )}

      {portfolio?.trades?.length > 0 && (
        <div className="trade-history">
          <h3>Trade History ({portfolio.trades.length})</h3>
          <div className="trades-list">
            {[...portfolio.trades].reverse().map(t => (
              <div key={t._id} className="trade-item">
                <span className={`trade-type ${t.type}`}>{t.type === 'buy' ? 'BUY' : 'SELL'}</span>
                <span className="trade-sym">{t.symbol}</span>
                <span className="trade-qty">{t.quantity} @ ₹{t.price}</span>
                <span className="trade-total">₹{(t.quantity * t.price).toLocaleString('en-IN')}</span>
                <span className="trade-date">{new Date(t.tradeDate).toLocaleDateString()}</span>
                <button className="btn-icon" onClick={() => removeTrade(t._id)}><FiTrash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTrade && (
        <div className="modal-overlay" onClick={() => setShowTrade(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Trade</h3>
            <form onSubmit={addTrade}>
              <div className="form-group"><label>Symbol</label><input type="text" value={tradeForm.symbol} onChange={e => setTradeForm({ ...tradeForm, symbol: e.target.value.toUpperCase() })} placeholder="RELIANCE" required /></div>
              <div className="form-group"><label>Type</label><select value={tradeForm.type} onChange={e => setTradeForm({ ...tradeForm, type: e.target.value })}><option value="buy">Buy</option><option value="sell">Sell</option></select></div>
              <div className="form-group"><label>Quantity</label><input type="number" min="1" value={tradeForm.quantity} onChange={e => setTradeForm({ ...tradeForm, quantity: e.target.value })} required /></div>
              <div className="form-group"><label>Price (₹)</label><input type="number" step="0.05" min="0" value={tradeForm.price} onChange={e => setTradeForm({ ...tradeForm, price: e.target.value })} required /></div>
              <div className="modal-actions"><button type="submit" className="btn btn-primary">Add Trade</button><button type="button" className="btn btn-outline" onClick={() => setShowTrade(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
