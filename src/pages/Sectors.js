import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockAPI } from '../services/api';
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiGrid } from 'react-icons/fi';

export default function Sectors() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('cards');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [secRes, heatRes] = await Promise.all([
        stockAPI.getSectors(),
        stockAPI.getSectorHeatmap().catch(() => ({ data: [] }))
      ]);
      setSectors(secRes.data);
      setHeatmap(heatRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getHeatColor = (val) => {
    if (val > 2) return '#16a34a';
    if (val > 0.5) return '#86efac';
    if (val > -0.5) return '#94a3b8';
    if (val > -2) return '#fca5a5';
    return '#dc2626';
  };

  if (loading) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /><p>Loading sector data...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiBarChart2 size={22} /> Sector Analysis</h1>
        <p className="page-subtitle">Performance breakdown by industry sector</p>
        <div className="view-toggle">
          <button className={`btn btn-sm ${view === 'cards' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('cards')}>Cards</button>
          <button className={`btn btn-sm ${view === 'heatmap' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('heatmap')}><FiGrid size={14} /> Heatmap</button>
        </div>
      </div>

      {view === 'heatmap' && heatmap.length > 0 && (
        <div className="heatmap-container">
          <div className="heatmap-grid">
            {heatmap.map(s => (
              <div key={s.sector} className="heatmap-cell" style={{ backgroundColor: getHeatColor(s.avgChange), cursor: 'pointer' }}
                title={`${s.sector}: ${s.avgChange >= 0 ? '+' : ''}${s.avgChange.toFixed(2)}%`}
                onClick={() => navigate(`/search?sector=${encodeURIComponent(s.sector)}`)}>
                <span className="heatmap-name">{s.sector}</span>
                <span className="heatmap-change">{s.avgChange >= 0 ? '+' : ''}{s.avgChange.toFixed(2)}%</span>
                <span className="heatmap-count">{s.stockCount} stocks</span>
              </div>
            ))}
          </div>
          {heatmap.length === 0 && <div className="empty-state">No heatmap data available</div>}
        </div>
      )}

      {view === 'cards' && (
        <div className="sectors-grid">
          {sectors.map(sector => {
            const isPositive = (sector.changePercent || 0) >= 0;

            return (
              <div key={sector.sector} className={`sector-card ${isPositive ? 'positive' : 'negative'}`}
                onClick={() => navigate(`/search?sector=${encodeURIComponent(sector.sector)}`)}
                style={{ cursor: 'pointer' }}>
                <div className="sector-card-header">
                  <h3>{sector.sector}</h3>
                  <span className={`sector-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
                    {isPositive ? '+' : ''}{sector.changePercent?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}%
                  </span>
                </div>

                <div className="sector-stats">
                  <div className="sector-stat">
                    <span className="stat-label">Stocks</span>
                    <span className="stat-value">{sector.stockCount || 0}</span>
                  </div>
                  <div className="sector-stat">
                    <span className="stat-label">Advancing</span>
                    <span className="stat-value positive">{sector.advancing || 0}</span>
                  </div>
                  <div className="sector-stat">
                    <span className="stat-label">Declining</span>
                    <span className="stat-value negative">{sector.declining || 0}</span>
                  </div>
                  <div className="sector-stat">
                    <span className="stat-label">Unchanged</span>
                    <span className="stat-value">{sector.unchanged || 0}</span>
                  </div>
                </div>

                <div className="sector-bar">
                  <div className="sector-bar-advancing" style={{ width: `${((sector.advancing || 0) / (sector.stockCount || 1)) * 100}%` }} />
                  <div className="sector-bar-declining" style={{ width: `${((sector.declining || 0) / (sector.stockCount || 1)) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
