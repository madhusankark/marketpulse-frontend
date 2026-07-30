import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { watchlistAPI, stockAPI } from '../services/api';
import { useMarket } from '../context/MarketContext';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiStar, FiX } from 'react-icons/fi';

export default function Watchlists() {
  const { quotes, fetchQuote } = useMarket();
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [activeWl, setActiveWl] = useState(null);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedStockQuote, setSelectedStockQuote] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showStockDropdown, setShowStockDropdown] = useState(false);

  const searchStocks = useCallback(async (q) => {
    if (!q || q.length < 1) { setStockResults([]); return; }
    setSearching(true);
    try {
      const res = await stockAPI.search(q, 10);
      setStockResults(res.data);
      setShowStockDropdown(true);
    } catch (err) { console.error(err); }
    finally { setSearching(false); }
  }, []);

  const debounceTimer = useRef();

  const handleStockSearch = (val) => {
    setStockQuery(val);
    setSelectedStock(null);
    setSelectedStockQuote(null);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => searchStocks(val), 300);
  };

  useEffect(() => { loadWatchlists(); }, []);

  const loadWatchlists = async () => {
    try {
      const res = await watchlistAPI.getAll();
      setWatchlists(res.data);
      if (res.data.length > 0 && !activeWl) setActiveWl(res.data[0]._id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createWatchlist = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await watchlistAPI.create({ name: newName, description: newDesc });
      const newWl = res.data;
      if (selectedStock) {
        await watchlistAPI.addStock(newWl._id, { symbol: selectedStock.symbol });
        newWl.stocks = [{ symbol: selectedStock.symbol, quote: selectedStockQuote }];
        toast.success(`Created & added ${selectedStock.symbol}`);
      } else {
        toast.success('Watchlist created');
      }
      setWatchlists([...watchlists, newWl]);
      setActiveWl(newWl._id);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setStockQuery('');
      setSelectedStock(null);
      setSelectedStockQuote(null);
      setStockResults([]);
    } catch (err) { toast.error(err.message); }
  };

  const deleteWatchlist = async (id) => {
    if (!window.confirm('Delete this watchlist?')) return;
    try {
      await watchlistAPI.remove(id);
      setWatchlists(watchlists.filter(w => w._id !== id));
      if (activeWl === id) setActiveWl(watchlists[0]?._id || null);
      toast.success('Watchlist deleted');
    } catch (err) { toast.error(err.message); }
  };

  const removeFromWatchlist = async (wlId, symbol) => {
    try {
      const res = await watchlistAPI.removeStock(wlId, symbol);
      setWatchlists(watchlists.map(w => w._id === wlId ? { ...w, stocks: res.data.stocks } : w));
      toast.success('Removed from watchlist');
    } catch (err) { toast.error(err.message); }
  };

  const currentWl = watchlists.find(w => w._id === activeWl);

  if (loading) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /><p>Loading watchlists...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiStar size={22} /> My Watchlists</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus size={14} /> New Watchlist</button>
      </div>

      <div className="watchlist-layout">
        <div className="wl-sidebar">
          {watchlists.map(wl => (
            <div key={wl._id} className={`wl-nav-item ${activeWl === wl._id ? 'active' : ''}`}
              onClick={() => setActiveWl(wl._id)}>
              <span className="wl-nav-name">{wl.name}</span>
              <span className="wl-nav-count">{wl.stocks?.length || 0}</span>
            </div>
          ))}
          {watchlists.length === 0 && <p className="no-wl">No watchlists yet. Create one to get started.</p>}
        </div>

        <div className="wl-content">
          {currentWl ? (
            <>
              <div className="wl-header">
                <div>
                  <h2>{currentWl.name}</h2>
                  {currentWl.description && <p>{currentWl.description}</p>}
                </div>
                <button className="btn btn-danger-sm" onClick={() => deleteWatchlist(currentWl._id)}>
                  <FiTrash2 size={14} /> Delete
                </button>
              </div>

              {currentWl.stocks?.length > 0 ? (
                <div className="wl-stocks-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentWl.stocks.map(item => {
                        const q = quotes[item.symbol] || item.quote;
                        const isPositive = q?.changePercent >= 0;
                        return (
                          <tr key={item._id || item.symbol}>
                            <td><Link to={`/stock/${item.symbol}`} className="symbol-link">{item.symbol}</Link></td>
                            <td>{q?.name || item.symbol}</td>
                            <td>{q?.lastPrice ? `₹${q.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                            <td className={isPositive ? 'positive' : 'negative'}>
                              {q?.changePercent != null ? `${isPositive ? '+' : ''}${q.changePercent.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}%` : '—'}
                            </td>
                            <td>
                              <button className="btn-icon" onClick={() => removeFromWatchlist(currentWl._id, item.symbol)}>
                                <FiX size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="wl-empty">
                  <p>This watchlist is empty.</p>
                  <Link to="/search" className="btn btn-outline">Browse Stocks</Link>
                </div>
              )}
            </>
          ) : (
            <div className="wl-empty">
              <p>Select a watchlist or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Watchlist</h3>
            <form onSubmit={createWatchlist}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" required value={newName}
                  onChange={(e) => setNewName(e.target.value)} placeholder="e.g., My Favorites" />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input type="text" value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description" />
              </div>
              <div className="form-group">
                <label>Add a stock (optional)</label>
                <div className="wl-create-search">
                  <input type="text" value={stockQuery}
                    onChange={(e) => handleStockSearch(e.target.value)}
                    onFocus={() => stockResults.length > 0 && setShowStockDropdown(true)}
                    placeholder="Search by symbol or name..." />
                  {searching && <span className="search-spinner" />}
                  {showStockDropdown && stockResults.length > 0 && (
                    <div className="wl-create-dropdown">
                      {stockResults.map(s => (
                        <div key={s.symbol} className={`wl-create-option ${selectedStock?.symbol === s.symbol ? 'selected' : ''}`}
                          onClick={async () => {
                            setSelectedStock(s);
                            setStockQuery(`${s.symbol} — ${s.name}`);
                            setShowStockDropdown(false);
                            try {
                              const qr = await stockAPI.getQuote(s.symbol);
                              setSelectedStockQuote(qr.data);
                            } catch (_) {
                              setSelectedStockQuote({ lastPrice: s.lastPrice, changePercent: s.changePercent, open: s.open });
                            }
                          }}>
                          <span className="opt-symbol">{s.symbol}</span>
                          <span className="opt-name">{s.name}</span>
                          {s.sector && <span className="opt-sector">{s.sector}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedStock ? 'Create & Add Stock' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
