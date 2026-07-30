import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';
import { FiSearch, FiFilter, FiArrowUp, FiArrowDown, FiChevronDown } from 'react-icons/fi';

export default function Screener() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [SECTORS, setSECTORS] = useState([]);
  const [filters, setFilters] = useState({ query: '', sector: '', price_min: '', price_max: '', change_min: '', change_max: '', volume_min: '', sort_by: 'volume', sort_order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const sectorRef = useRef(null);

  useEffect(() => {
    stockAPI.getSectorNames().then(r => setSECTORS(r.data)).catch(() => {});
  }, []);

  const search = async (f) => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) params[k] = v; });
      const res = await stockAPI.screener(params);
      setResults(res?.data || []);
    } catch (_) { setResults([]); }
    setLoading(false);
  };

  useEffect(() => { search(filters); }, []);

  useEffect(() => {
    const handleClick = (e) => { if (sectorRef.current && !sectorRef.current.contains(e.target)) setSectorOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    search(next);
  };

  const toggleSort = (field) => {
    const order = filters.sort_by === field && filters.sort_order === 'desc' ? 'asc' : 'desc';
    updateFilter('sort_by', field);
    updateFilter('sort_order', order);
  };

  return (
    <div className="page-container">
      <h1><FiFilter size={20} /> Stock Screener</h1>
      <div className="screener-search-bar">
        <FiSearch size={18} />
        <input type="text" placeholder="Search by symbol or name..." value={filters.query} onChange={e => updateFilter('query', e.target.value)} />
        <button className="btn btn-outline" onClick={() => setShowFilters(!showFilters)}><FiFilter size={14} /> {showFilters ? 'Hide' : 'Show'} Filters</button>
      </div>
      {showFilters && (
        <div className="screener-filters">
          <div className="filter-row">
            <div className="filter-group" ref={sectorRef}>
              <label>Sector</label>
              <div className="custom-select" onClick={() => setSectorOpen(!sectorOpen)}>
                <span className={filters.sector ? 'selected' : 'placeholder'}>{filters.sector || 'All Sectors'}</span>
                <FiChevronDown size={14} className={`chevron ${sectorOpen ? 'open' : ''}`} />
                {sectorOpen && (
                  <div className="custom-select-dropdown">
                    <div className={`custom-select-option ${!filters.sector ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); updateFilter('sector', ''); setSectorOpen(false); }}>All Sectors</div>
                    {SECTORS.map(s => (
                      <div key={s} className={`custom-select-option ${filters.sector === s ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); updateFilter('sector', s); setSectorOpen(false); }}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-group">
              <label>Min Price</label>
              <input type="number" placeholder="0" value={filters.price_min} onChange={e => updateFilter('price_min', e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Max Price</label>
              <input type="number" placeholder="99999" value={filters.price_max} onChange={e => updateFilter('price_max', e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Min Change %</label>
              <input type="number" placeholder="-10" value={filters.change_min} onChange={e => updateFilter('change_min', e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Max Change %</label>
              <input type="number" placeholder="10" value={filters.change_max} onChange={e => updateFilter('change_max', e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Min Volume</label>
              <input type="number" placeholder="0" value={filters.volume_min} onChange={e => updateFilter('volume_min', e.target.value)} />
            </div>
          </div>
        </div>
      )}
      {loading ? <div className="loading-spinner">Loading...</div> : (
        <div className="screener-results">
          <div className="screener-header">
            <span className="screener-col sym" onClick={() => toggleSort('symbol')}>Symbol {filters.sort_by === 'symbol' && <SortIcon dir={filters.sort_order} />}</span>
            <span className="screener-col price" onClick={() => toggleSort('lastPrice')}>Price {filters.sort_by === 'lastPrice' && <SortIcon dir={filters.sort_order} />}</span>
            <span className="screener-col chg" onClick={() => toggleSort('changePercent')}>Change% {filters.sort_by === 'changePercent' && <SortIcon dir={filters.sort_order} />}</span>
            <span className="screener-col vol" onClick={() => toggleSort('volume')}>Volume {filters.sort_by === 'volume' && <SortIcon dir={filters.sort_order} />}</span>
          </div>
          {results.map((s, i) => (
            <div key={i} className="screener-row" onClick={() => navigate(`/stock/${s.symbol}`)}>
              <span className="screener-col sym">{s.symbol}</span>
              <span className="screener-col price">₹{s.lastPrice?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              <span className={`screener-col chg ${(s.changePercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(s.changePercent || 0) >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
              </span>
              <span className="screener-col vol">{(s.volume || 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {results.length === 0 && <div className="empty-state">No stocks match your filters</div>}
        </div>
      )}
    </div>
  );
}

function SortIcon({ dir }) {
  return dir === 'desc' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />;
}
