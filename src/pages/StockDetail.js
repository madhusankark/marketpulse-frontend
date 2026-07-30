import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { stockAPI, watchlistAPI, alertAPI } from '../services/api';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import StockChart from '../components/StockChart';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiTrendingDown, FiStar, FiArrowLeft, FiBell, FiBarChart2, FiActivity, FiFileText, FiGrid, FiX, FiSearch } from 'react-icons/fi';

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotes, subscribeQuote, unsubscribeQuote, fetchQuote } = useMarket();
  const [details, setDetails] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [intradayData, setIntradayData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartDays, setChartDays] = useState(90);
  const [watchlists, setWatchlists] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({ name: '', type: 'price_above', value: '' });
  const [fundamentals, setFundamentals] = useState(null);
  const [news, setNews] = useState([]);
  const [chartType, setChartType] = useState('candlestick');
  const [showIndicators, setShowIndicators] = useState(false);
  const [indicators, setIndicators] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [compareData, setCompareData] = useState({});
  const [compareInput, setCompareInput] = useState('');
  const [compareSuggestions, setCompareSuggestions] = useState([]);
  const [compareInfo, setCompareInfo] = useState([]);
  const compareColors = ['#8b5cf6', '#06b6d4', '#f59e0b'];

  const upperSymbol = useMemo(() => symbol?.toUpperCase() || '', [symbol]);

  const liveQuote = useMemo(() => {
    // IMPORTANT: We spread details (from getDetails API) as the base, then
    // selectively merge ONLY real-time price fields from WebSocket quotes.
    // Session-level stats (dayHigh, dayLow, open, vwap, week52High/Low) come
    // ONLY from details — never from socket data (which may be stale).
    // Each field uses null-coalescing so undefined socket values don't overwrite
    // correct details values.
    const q = quotes[upperSymbol] || {};
    return {
      ...details,
      lastPrice: q.lastPrice ?? details?.lastPrice,
      change: q.change ?? details?.change,
      changePercent: q.changePercent ?? details?.changePercent
    };
  }, [details, quotes, upperSymbol]);

  useEffect(() => {
    if (!upperSymbol) return;
    subscribeQuote(upperSymbol);
    fetchQuote(upperSymbol);
    return () => unsubscribeQuote(upperSymbol);
  }, [upperSymbol, subscribeQuote, unsubscribeQuote, fetchQuote]);

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    setChartData([]);
    setIntradayData([]);

    const load = async () => {
      try {
        const detRes = await stockAPI.getDetails(upperSymbol);
        if (cancelled) return;
        setDetails(detRes.data);

        setChartLoading(true);
        const [periodRes, intraRes, fundRes, newsRes] = await Promise.all([
          chartDays === 1 ? stockAPI.getIntraday(upperSymbol) : stockAPI.getHistory(upperSymbol, chartDays),
          stockAPI.getIntraday(upperSymbol),
          stockAPI.getFundamentals(upperSymbol).catch(() => ({ data: null })),
          stockAPI.getNews(upperSymbol).catch(() => ({ data: [] }))
        ]);
        if (!cancelled) { setFundamentals(fundRes?.data); setNews(newsRes?.data || []); }
        if (cancelled) return;
        setChartData(periodRes.data || []);
        setIntradayData(intraRes.data || []);

        if (user) {
          watchlistAPI.getAll().then(r => { if (!cancelled) setWatchlists(r.data); }).catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        toast.error('Failed to load stock details');
        navigate('/dashboard');
      } finally {
        if (!cancelled) { setChartLoading(false); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [upperSymbol, chartDays, user, navigate]);

  useEffect(() => {
    if (chartDays !== 1 || !upperSymbol) return;
    const iv = setInterval(async () => {
      try {
        const res = await stockAPI.getIntraday(upperSymbol);
        setChartData(res.data);
        setIntradayData(res.data);
      } catch (_) {}
    }, 30000);
    return () => clearInterval(iv);
  }, [chartDays, upperSymbol]);

  const compareKey = compareList.join(',');
  useEffect(() => {
    if (compareList.length === 0) { setCompareData({}); return; }
    let cancelled = false;
    (async () => {
      const results = {};
      for (const sym of compareList) {
        try {
          const res = await (chartDays === 1 ? stockAPI.getIntraday(sym) : stockAPI.getHistory(sym, chartDays));
          if (!cancelled) results[sym] = res.data || [];
        } catch (_) { if (!cancelled) results[sym] = []; }
      }
      if (!cancelled) setCompareData(results);
    })();
    return () => { cancelled = true; };
  }, [compareKey, chartDays]);

  useEffect(() => {
    if (!compareInput || compareInput.length < 1) { setCompareSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await stockAPI.search(compareInput);
        setCompareSuggestions((res.data || []).slice(0, 8));
      } catch (_) { setCompareSuggestions([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [compareInput]);

  useEffect(() => {
    if (compareList.length === 0) { setCompareInfo([]); return; }
    let cancelled = false;
    (async () => {
      const results = [];
      for (const sym of compareList) {
        try {
          const [qRes, fRes] = await Promise.all([
            stockAPI.getQuote(sym).catch(() => ({ data: null })),
            stockAPI.getFundamentals(sym).catch(() => ({ data: null }))
          ]);
          if (!cancelled) results.push({ symbol: sym, quote: qRes?.data, fundamentals: fRes?.data });
        } catch (_) { if (!cancelled) results.push({ symbol: sym, quote: null, fundamentals: null }); }
      }
      if (!cancelled) setCompareInfo(results);
    })();
    return () => { cancelled = true; };
  }, [compareList.join(',')]);

  const addComparison = useCallback(async (sym) => {
    const s = sym.toUpperCase();
    if (compareList.length >= 3 || s === upperSymbol || compareList.includes(s)) return;
    setCompareList(prev => [...prev, s]);
    setCompareInput('');
    setCompareSuggestions([]);
  }, [compareList, upperSymbol]);

  const removeComparison = useCallback((sym) => {
    setCompareList(prev => prev.filter(s => s !== sym));
  }, []);

  const periodStats = useMemo(() => {
    const d = liveQuote;
    if (!d || d.lastPrice == null) return null;

    const open = d.open;
    const high = d.dayHigh;
    const low = d.dayLow;
    const prevClose = d.previousClose ?? d.lastPrice;
    const close = d.lastPrice;
    const vwap = d.vwap ?? null;
    // Use backend-provided change/changePercent. If unavailable, calculate from close.
    const change = d.change !== undefined && d.change !== null ? d.change : (close - prevClose);
    const changePct = d.changePercent !== undefined && d.changePercent !== null
      ? d.changePercent
      : (prevClose ? (change / prevClose) * 100 : 0);
    const volume = d.volume ?? 0;
    const turnover = d.turnover ?? 0;
    const week52High = d.week52High ?? 0;
    const week52Low = d.week52Low ?? 0;

    // IMPORTANT: Do NOT fallback to intradayData for open/high/low here!
    // intradayData can contain synthetic/generated data when real APIs fail,
    // which would give incorrect period statistics.
    // The backend already handles all fallback logic. If values are null here,
    // it means no reliable source was available — display as '—'.

    return { open, high, low, close, prevClose, vwap, change, changePct, volume, turnover, week52High, week52Low };
  }, [liveQuote]);

  const addToWatchlist = async (watchlistId) => {
    try {
      await watchlistAPI.addStock(watchlistId, { symbol: upperSymbol });
      toast.success('Added to watchlist');
    } catch (err) {
      toast.error(err.message || 'Failed to add');
    }
  };

  const createAlert = async (e) => {
    e.preventDefault();
    try {
      await alertAPI.create({
        name: alertForm.name || `${upperSymbol} Alert`,
        symbol: upperSymbol,
        rules: [{ type: alertForm.type, value: parseFloat(alertForm.value) }],
        logic: 'OR'
      });
      toast.success('Alert created');
      setShowAlertModal(false);
      setAlertForm({ name: '', type: 'price_above', value: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to create alert');
    }
  };

  if (!details) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /><p>Loading {upperSymbol}...</p></div></div>;
  }

  const q = liveQuote || {};
  const isPositive = (q.changePercent || 0) >= 0;
  const dayLow = periodStats ? periodStats.low : q.dayLow;
  const dayHigh = periodStats ? periodStats.high : q.dayHigh;
  const dayRangePct = dayLow && dayHigh && dayHigh !== dayLow ? ((q.lastPrice - dayLow) / (dayHigh - dayLow)) * 100 : 0;

  const formatVal = (val, isCurrency = true) => {
    if (val == null || isNaN(val)) return '—';
    const num = Number(val);
    const formatted = Number.isInteger(num)
      ? num.toLocaleString('en-IN')
      : num.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return isCurrency ? `₹${formatted}` : formatted;
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate(-1)}><FiArrowLeft size={16} /> Back</button>

      <div className="stock-detail-header">
        <div className="sdh-left">
          <h1>{details.name}</h1>
          <div className="sdh-meta">
            <span className="sdh-symbol">{upperSymbol}</span>
            <span className="sdh-exchange">{details.exchange}</span>
            {details.sector ? <span className="sdh-sector">{details.sector}</span> : null}
          </div>
        </div>
        <div className="sdh-right">
          <span className="sdh-price">{formatVal(q.lastPrice)}</span>
          <span className={`sdh-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
            {isPositive ? '+' : ''}{q.change ?? 0} ({isPositive ? '+' : ''}{q.changePercent ?? 0}%)
          </span>
        </div>
      </div>

      <div className="sdh-actions">
        {user && watchlists.length > 0 && (
          <div className="dropdown">
            <button className="btn btn-outline"><FiStar size={14} /> Add to Watchlist</button>
            <div className="dropdown-menu">
              {watchlists.map(wl => (
                <button key={wl._id} onClick={() => addToWatchlist(wl._id)}>{wl.name}</button>
              ))}
            </div>
          </div>
        )}
        {user && (
          <button className="btn btn-outline" onClick={() => setShowAlertModal(true)}>
            <FiBell size={14} /> Create Alert
          </button>
        )}
        {!user && (
          <div className="guest-prompt">
            <Link to="/login">Sign in</Link> to add to watchlist or create alerts
          </div>
        )}
      </div>

      <div className="stock-detail-grid">
        <div className="sd-main">
          <div className="chart-controls">
            <h3><FiBarChart2 size={16} /> Price History</h3>
            <div className="chart-options-row">
              <div className="chart-period-selector">
                {[1, 5, 30, 90, 180, 365].map(d => (
                  <button key={d} className={chartDays === d ? 'active' : ''} onClick={() => setChartDays(d)}>
                    {d === 1 ? '1D' : d === 5 ? '1W' : d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
                  </button>
                ))}
              </div>
              <div className="chart-type-selector">
                {['candlestick', 'line', 'area'].map(t => (
                  <button key={t} className={chartType === t ? 'active' : ''} onClick={() => setChartType(t)}>
                    {t === 'candlestick' ? 'Candle' : t === 'line' ? 'Line' : 'Area'}
                  </button>
                ))}
                <button className={`indicator-toggle ${showIndicators ? 'active' : ''}`}
                  onClick={() => { setShowIndicators(!showIndicators); if (!showIndicators && !indicators) { stockAPI.getIndicators(upperSymbol).then(r => setIndicators(r.data)).catch(() => {}); } }}>
                  <FiActivity size={14} /> Indicators
                </button>
                <button className={`indicator-toggle ${showCompare ? 'active' : ''}`}
                  onClick={() => setShowCompare(!showCompare)}>
                  <FiBarChart2 size={14} /> Compare
                </button>
              </div>
            </div>
          </div>
          {showCompare && (
            <div className="compare-bar">
              {compareList.map((sym, i) => (
                <span key={sym} className="compare-chip" style={{ borderColor: compareColors[i] }}>
                  <span className="compare-chip-dot" style={{ background: compareColors[i] }} />
                  {sym}
                  <button className="compare-chip-remove" onClick={() => removeComparison(sym)}><FiX size={12} /></button>
                </span>
              ))}
              {compareList.length < 3 && (
                <div className="compare-input-wrapper">
                  <FiSearch size={14} className="compare-input-icon" />
                  <input className="compare-input" placeholder="+ Add comparison" value={compareInput}
                    onChange={e => setCompareInput(e.target.value)} onKeyDown={e => {
                      if (e.key === 'Enter' && compareSuggestions.length > 0) addComparison(compareSuggestions[0].symbol);
                    }} />
                  {compareSuggestions.length > 0 && (
                    <div className="compare-suggestions">
                      {compareSuggestions.map(s => (
                        <div key={s.symbol} className="compare-suggestion-item" onClick={() => addComparison(s.symbol)}
                          onMouseDown={e => e.preventDefault()}>
                          <strong>{s.symbol}</strong>
                          <span>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {chartLoading && chartData.length === 0 ? (
            <div className="tv-chart-container" style={{ height: 450 }}>
              <div className="tv-chart-empty">Loading chart data...</div>
            </div>
          ) : (
            <StockChart data={chartData} symbol={upperSymbol}
              change={q.change} changePercent={q.changePercent} height={450}
              chartType={chartType} indicators={showIndicators ? indicators : null}
              comparisons={compareList.map((sym, i) => ({ symbol: sym, data: compareData[sym] || [], color: compareColors[i] })).filter(c => c.data.length > 0)} />
          )}

          {compareInfo.length > 0 && (
            <div className="info-card compare-table-card">
              <h4><FiBarChart2 size={14} /> Comparison</h4>
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="ct-main">{upperSymbol}</th>
                      {compareInfo.map(c => {
                        const idx = compareList.indexOf(c.symbol);
                        return <th key={c.symbol} className="ct-comp" style={{ color: compareColors[idx] }}>{c.symbol}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'LTP', key: 'lastPrice', fmt: v => formatVal(v) },
                      { label: 'Change', key: 'changePercent', fmt: v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', cls: v => v >= 0 ? 'positive' : 'negative' },
                      { label: 'Volume', key: 'volume', fmt: v => v != null ? v >= 1000000 ? `${(v / 1000000).toFixed(2)}M` : v.toLocaleString('en-IN') : '—' },
                      { label: 'P/E', key: 'pe', from: 'fundamentals', fmt: v => v != null ? v.toFixed(2) : '—' },
                      { label: 'EPS', key: 'eps', from: 'fundamentals', fmt: v => v != null ? `₹${v}` : '—' },
                      { label: 'Mkt Cap', key: 'marketCap', from: 'fundamentals', fmt: v => v != null ? formatVal(v) : '—' },
                      { label: 'Div Yield', key: 'dividendYield', from: 'fundamentals', fmt: v => v != null ? `${v}%` : '—' },
                      { label: 'ROE', key: 'roe', from: 'fundamentals', fmt: v => v != null ? `${v}%` : '—' },
                      { label: '52W High', key: 'week52High', fmt: v => formatVal(v) },
                      { label: '52W Low', key: 'week52Low', fmt: v => formatVal(v) },
                    ].map(row => (
                      <tr key={row.key}>
                        <td className="ct-label">{row.label}</td>
                        <td className={`ct-val ${row.cls ? row.cls(liveQuote?.[row.key]) : ''}`}>
                          {row.from === 'fundamentals'
                            ? row.fmt(fundamentals?.[row.key])
                            : row.fmt(liveQuote?.[row.key])}
                        </td>
                        {compareInfo.map(c => {
                          const src = row.from === 'fundamentals' ? c.fundamentals : c.quote;
                          const val = src?.[row.key];
                          return <td key={c.symbol} className={`ct-val ${row.cls ? row.cls(val) : ''}`}>{row.fmt(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="stock-info-grid">
            <div className="info-card">
              <h4>Day's Range</h4>
              <div className="range-bar">
                <span>{formatVal(dayLow)}</span>
                <div className="range-track">
                  <div className="range-fill" style={{ left: 0, width: `${dayRangePct}%` }} />
                </div>
                <span>{formatVal(dayHigh)}</span>
              </div>
            </div>
            <div className="info-card">
              <h4>52 Week Range</h4>
              <div className="range-bar">
                <span>{formatVal(details.week52Low)}</span>
                <div className="range-track">
                  <div className="range-fill" style={{
                    left: 0,
                    width: `${details.week52Low && details.week52High && details.week52High !== details.week52Low ? ((q.lastPrice - details.week52Low) / (details.week52High - details.week52Low)) * 100 : 0}%`
                  }} />
                </div>
                <span>{formatVal(details.week52High)}</span>
              </div>
            </div>
          </div>

          {fundamentals && fundamentals.companyName && (
            <div className="info-card fundamentals-card">
              <h4><FiFileText size={14} /> Fundamentals</h4>
              <div className="fundamentals-grid">
                <div className="fund-item"><span className="fund-label">Market Cap</span><span className="fund-value">{fundamentals.marketCap ? formatVal(fundamentals.marketCap) : '—'}</span></div>
                <div className="fund-item"><span className="fund-label">P/E</span><span className="fund-value">{fundamentals.pe != null ? fundamentals.pe.toFixed(2) : '—'}</span></div>
                <div className="fund-item"><span className="fund-label">EPS</span><span className="fund-value">{fundamentals.eps != null ? `₹${fundamentals.eps}` : '—'}</span></div>
                <div className="fund-item"><span className="fund-label">Dividend Yield</span><span className="fund-value">{fundamentals.dividendYield != null ? `${fundamentals.dividendYield}%` : '—'}</span></div>
                <div className="fund-item"><span className="fund-label">ROE</span><span className="fund-value">{fundamentals.roe != null ? `${fundamentals.roe}%` : '—'}</span></div>
                <div className="fund-item"><span className="fund-label">Face Value</span><span className="fund-value">{fundamentals.faceValue != null ? `₹${fundamentals.faceValue}` : '—'}</span></div>
              </div>
            </div>
          )}

          {news.length > 0 && (
            <div className="info-card news-card">
              <h4><FiGrid size={14} /> News & Announcements</h4>
              <div className="news-list">
                {news.map((item, i) => (
                  <div key={i} className="news-item">
                    <div className="news-item-content">
                      {item.url ? (
                        <a className="news-item-title" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                      ) : (
                        <span className="news-item-title">{item.title}</span>
                      )}
                      <div className="news-item-meta">
                        {item.source && <span className="news-source">{item.source}</span>}
                        <span className="news-date">{item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sd-sidebar">
          <div className="quote-details">
            <h3>Period Statistics</h3>
            <table>
              <tbody>
                <tr><td>Open</td><td>{formatVal(periodStats?.open)}</td></tr>
                <tr><td>High</td><td>{formatVal(periodStats?.high)}</td></tr>
                <tr><td>Low</td><td>{formatVal(periodStats?.low)}</td></tr>
                <tr><td>Prev. Close</td><td>{formatVal(periodStats?.prevClose)}</td></tr>
                <tr><td>Close *</td><td>{formatVal(periodStats?.close)}</td></tr>
                <tr><td>VWAP</td><td>{formatVal(periodStats?.vwap)}</td></tr>
                <tr><td>Change</td><td className={(periodStats?.change ?? 0) >= 0 ? 'positive' : 'negative'}>{periodStats ? `${periodStats.change >= 0 ? '+' : ''}${formatVal(periodStats.change, false)} (${periodStats.changePct >= 0 ? '+' : ''}${periodStats.changePct.toFixed(2)}%)` : '—'}</td></tr>
                <tr><td>Volume</td><td>{formatVal(periodStats?.volume, false)}</td></tr>
                <tr><td>Turnover</td><td>{formatVal(periodStats?.turnover)}</td></tr>
                <tr><td>52W High</td><td>{formatVal(periodStats?.week52High)}</td></tr>
                <tr><td>52W Low</td><td>{formatVal(periodStats?.week52Low)}</td></tr>
              </tbody>
            </table>
          </div>

          {q.rating && (
            <div className="quote-details" style={{ marginTop: 16 }}>
              <h3>Market Sentiment</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Overall Rating</td>
                    <td><span className={`badge-${q.changePercent >= 0 ? 'success' : 'danger'}`}>{q.rating}</span></td>
                  </tr>
                  {q.shortTermTrend && (
                    <tr>
                      <td>Short Term</td>
                      <td>{q.shortTermTrend}</td>
                    </tr>
                  )}
                  {q.longTermTrend && (
                    <tr>
                      <td>Long Term</td>
                      <td>{q.longTermTrend}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Alert for {symbol}</h3>
            <form onSubmit={createAlert}>
              <div className="form-group">
                <label>Alert Name</label>
                <input type="text" value={alertForm.name}
                  onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                  placeholder={`${symbol} Price Alert`} />
              </div>
              <div className="form-group">
                <label>Condition</label>
                <select value={alertForm.type}
                  onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}>
                  <option value="price_above">Price Above</option>
                  <option value="price_below">Price Below</option>
                  <option value="pct_change_above">% Change Above</option>
                  <option value="pct_change_below">% Change Below</option>
                  <option value="volume_spike">Volume Spike Above</option>
                  <option value="week52_high">Near 52-Week High</option>
                  <option value="week52_low">Near 52-Week Low</option>
                </select>
              </div>
              <div className="form-group">
                <label>Value</label>
                <input type="number" step="0.01" required value={alertForm.value}
                  onChange={(e) => setAlertForm({ ...alertForm, value: e.target.value })}
                  placeholder="Enter threshold value" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAlertModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
