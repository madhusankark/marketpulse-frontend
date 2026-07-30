import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { stockAPI, watchlistAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StockCard from '../components/StockCard';
import toast from 'react-hot-toast';
import { FiSearch, FiStar } from 'react-icons/fi';

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [mostActive, setMostActive] = useState([]);
  const [week52, setWeek52] = useState({ nearHigh52Week: [], nearLow52Week: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [watchlists, setWatchlists] = useState([]);
  const [addingSymbol, setAddingSymbol] = useState(null);
  const [sectorFor, setSectorFor] = useState(searchParams.get('sector') || '');

  useEffect(() => {
    if (user) {
      watchlistAPI.getAll().then(r => setWatchlists(r.data)).catch(() => {});
    }
  }, [user]);

  const addToWatchlist = async (wlId, symbol) => {
    try {
      await watchlistAPI.addStock(wlId, { symbol });
      toast.success(`Added ${symbol} to watchlist`);
      setAddingSymbol(null);
    } catch (err) {
      toast.error(err.message || 'Failed to add');
      setAddingSymbol(null);
    }
  };

  const fetchStocks = useCallback(async (q, limit = 20) => {
    setLoading(true);
    try {
      const res = await stockAPI.search(q, limit);
      setResults(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchSectorStocks = useCallback(async (name) => {
    setLoading(true);
    try {
      const res = await stockAPI.getSectorStocks(name);
      setResults(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const filter = searchParams.get('filter');
    const sector = searchParams.get('sector');
    if (q) { setQuery(q); fetchStocks(q); setActiveTab('search'); setSectorFor(''); }
    if (sector) { setQuery(''); fetchSectorStocks(sector); setActiveTab('search'); setSectorFor(sector); }
    if (filter) {
      setActiveTab(filter);
      loadFilterData(filter);
    }
  }, [searchParams]);

  const loadFilterData = async (filter) => {
    setLoading(true);
    try {
      if (filter === 'gainers') {
        const res = await stockAPI.getGainers(20);
        setGainers(res.data);
      } else if (filter === 'losers') {
        const res = await stockAPI.getLosers(20);
        setLosers(res.data);
      } else if (filter === '52week') {
        const res = await stockAPI.get52WeekHighLow();
        setWeek52(res.data);
      } else if (filter === 'mostactive') {
        const res = await stockAPI.getMostActive(20);
        setMostActive(res.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (sectorFor) return;
    setSearchParams({ q: query });
  };

  const sectorBase = sectorFor && results.length > 0
    ? results.filter(s => {
        if (!query) return true;
        const q = query.toUpperCase();
        return s.symbol.includes(q) || (s.name || '').toUpperCase().includes(q);
      })
    : [];
  const sectorGainers = sectorBase.length > 0
    ? [...sectorBase].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
    : [];
  const sectorLosers = sectorBase.length > 0
    ? [...sectorBase].sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
    : [];
  const sectorMostActive = sectorBase.length > 0
    ? [...sectorBase].sort((a, b) => (b.volume || 0) - (a.volume || 0))
    : [];
  const sectorWeek52 = sectorBase.length > 0
    ? {
        nearHigh52Week: sectorBase.filter(s => s.yearHigh && s.lastPrice && ((s.yearHigh - s.lastPrice) / s.yearHigh) < 0.1).sort((a, b) => ((b.yearHigh - b.lastPrice) / b.yearHigh) - ((a.yearHigh - a.lastPrice) / a.yearHigh)),
        nearLow52Week: sectorBase.filter(s => s.yearLow && s.lastPrice && ((s.lastPrice - s.yearLow) / s.yearLow) < 0.1).sort((a, b) => ((a.lastPrice - a.yearLow) / a.yearLow) - ((b.lastPrice - b.yearLow) / b.yearLow))
      }
    : { nearHigh52Week: [], nearLow52Week: [] };

  const renderStockRow = (stock) => (
    <div key={stock.symbol} className="stock-list-item">
      <Link to={`/stock/${stock.symbol}`} style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
        <span className="stock-symbol">{stock.symbol}</span>
        <span className="stock-name">{stock.name}</span>
        {stock.sector && <span className="stock-sector">{stock.sector}</span>}
        {stock.lastPrice ? (
          <span className="stock-price" style={{ marginLeft: 'auto' }}>₹{stock.lastPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        ) : null}
      </Link>
      {user && watchlists.length > 0 && (
        <div className="wl-add-btn-container">
          <button className="wl-add-btn" onClick={() => setAddingSymbol(addingSymbol === stock.symbol ? null : stock.symbol)}>
            <FiStar size={14} />
          </button>
          {addingSymbol === stock.symbol && (
            <div className="wl-add-dropdown">
              {watchlists.map(wl => (
                <button key={wl._id} onClick={() => addToWatchlist(wl._id, stock.symbol)}>{wl.name}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Stock Search & Discovery</h1>
      </div>

      <form className="search-large" onSubmit={handleSearch}>
        <FiSearch size={20} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={sectorFor ? `Search within ${sectorFor}...` : "Search by symbol or company name..."} autoFocus />
        <button type="submit" className="btn btn-primary">{sectorFor ? 'Filter' : 'Search'}</button>
      </form>

      {sectorFor && (
        <div className="sector-active">
          <span className="sector-active-label">{sectorFor}</span>
          <span className="sector-active-count">{results.length} stocks</span>
          <button className="sector-active-clear" onClick={() => { setSectorFor(''); setSearchParams({}); setResults([]); setQuery(''); }}>×</button>
        </div>
      )}

      <div className="filter-tabs">
        {(sectorFor ? ['gainers', 'losers', 'mostactive', '52week'] : ['search', 'gainers', 'losers', 'mostactive', '52week']).map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); if (tab !== 'search' && !sectorFor) loadFilterData(tab); }}>
            {tab === 'search' ? 'Search Results' : tab === 'gainers' ? 'Top Gainers' : tab === 'losers' ? 'Top Losers' : tab === 'mostactive' ? 'Most Active' : '52 Week High/Low'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><p>Loading...</p></div>
      ) : (
        <div className="search-results">
          {activeTab === 'search' && !sectorFor && (
            results.length > 0 ? (
              <div className="stock-grid">
                {results.map(stock => renderStockRow(stock))}
              </div>
            ) : <p className="no-results">{query ? 'No stocks found. Try a different search.' : 'Type to search stocks.'}</p>
          )}

          {activeTab === 'search' && sectorFor && (
            sectorBase.length > 0 ? (
              <div className="stock-grid">
                {sectorBase.map(stock => renderStockRow(stock))}
              </div>
            ) : <p className="no-results">{query ? 'No stocks match your search within this sector.' : 'No stocks found for this sector.'}</p>
          )}

          {activeTab === 'gainers' && (
            <div className="stock-grid">
              {(sectorFor ? sectorGainers : gainers).map(q => <StockCard key={q.symbol} quote={q} />)}
            </div>
          )}

          {activeTab === 'losers' && (
            <div className="stock-grid">
              {(sectorFor ? sectorLosers : losers).map(q => <StockCard key={q.symbol} quote={q} />)}
            </div>
          )}

          {activeTab === 'mostactive' && (
            <div className="stock-grid">
              {(sectorFor ? sectorMostActive : mostActive).map(q => <StockCard key={q.symbol} quote={q} />)}
            </div>
          )}

          {activeTab === '52week' && (
            sectorFor ? (
              <div className="week52-grid">
                <div className="week52-section">
                  <h3>Near 52-Week High</h3>
                  {sectorWeek52.nearHigh52Week.length > 0 ? sectorWeek52.nearHigh52Week.map(s => (
                    <div key={s.symbol} className="week52-item positive">
                      <Link to={`/stock/${s.symbol}`} style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                        <span className="w52-symbol">{s.symbol}</span>
                        <span className="w52-price">₹{s.lastPrice?.toLocaleString('en-IN')}</span>
                        <span className="w52-high">52W High: ₹{s.yearHigh?.toLocaleString('en-IN')}</span>
                        <span className="w52-dist">{((s.yearHigh - s.lastPrice) / s.yearHigh * 100)?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}% from high</span>
                      </Link>
                    </div>
                  )) : <p className="no-results">No stocks near 52-week high in this sector.</p>}
                </div>
                <div className="week52-section">
                  <h3>Near 52-Week Low</h3>
                  {sectorWeek52.nearLow52Week.length > 0 ? sectorWeek52.nearLow52Week.map(s => (
                    <div key={s.symbol} className="week52-item negative">
                      <Link to={`/stock/${s.symbol}`} style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                        <span className="w52-symbol">{s.symbol}</span>
                        <span className="w52-price">₹{s.lastPrice?.toLocaleString('en-IN')}</span>
                        <span className="w52-low">52W Low: ₹{s.yearLow?.toLocaleString('en-IN')}</span>
                        <span className="w52-dist">{((s.lastPrice - s.yearLow) / s.yearLow * 100)?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}% from low</span>
                      </Link>
                    </div>
                  )) : <p className="no-results">No stocks near 52-week low in this sector.</p>}
                </div>
              </div>
            ) : (
              <div className="week52-grid">
                <div className="week52-section">
                  <h3>Near 52-Week High</h3>
                  {week52.nearHigh52Week?.map(s => (
                    <div key={s.symbol} className="week52-item positive">
                      <Link to={`/stock/${s.symbol}`} style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                        <span className="w52-symbol">{s.symbol}</span>
                        <span className="w52-price">₹{s.currentPrice?.toLocaleString('en-IN')}</span>
                        <span className="w52-high">52W High: ₹{s.week52High?.toLocaleString('en-IN')}</span>
                        <span className="w52-dist">{s.distFromHigh?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}% from high</span>
                      </Link>
                    </div>
                  ))}
                </div>
                <div className="week52-section">
                  <h3>Near 52-Week Low</h3>
                  {week52.nearLow52Week?.map(s => (
                    <div key={s.symbol} className="week52-item negative">
                      <Link to={`/stock/${s.symbol}`} style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                        <span className="w52-symbol">{s.symbol}</span>
                        <span className="w52-price">₹{s.currentPrice?.toLocaleString('en-IN')}</span>
                        <span className="w52-low">52W Low: ₹{s.week52Low?.toLocaleString('en-IN')}</span>
                        <span className="w52-dist">{s.distFromLow?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}% from low</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
