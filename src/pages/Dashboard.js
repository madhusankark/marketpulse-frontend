import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stockAPI } from '../services/api';
import IndexBar from '../components/IndexBar';
import StockCard from '../components/StockCard';
import { FiTrendingUp, FiTrendingDown, FiBarChart2, FiArrowUp, FiArrowDown } from 'react-icons/fi';

export default function Dashboard() {
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [mostActive, setMostActive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [g, l, a] = await Promise.all([
          stockAPI.getGainers(5).catch(() => null),
          stockAPI.getLosers(5).catch(() => null),
          stockAPI.getMostActive(5).catch(() => null)
        ]);
        setGainers(Array.isArray(g?.data) ? g.data : (Array.isArray(g) ? g : []));
        setLosers(Array.isArray(l?.data) ? l.data : (Array.isArray(l) ? l : []));
        setMostActive(Array.isArray(a?.data) ? a.data : (Array.isArray(a) ? a : []));
      } catch (err) { /* silent */ }
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Market Dashboard</h1>
        <p className="page-subtitle">Real-time Indian stock market overview</p>
      </div>

      <IndexBar />

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <h2><FiArrowUp size={18} className="positive-icon" /> Top Gainers</h2>
            <Link to="/search?filter=gainers" className="view-all-link">View All</Link>
          </div>
          <div className="stock-list">
            {gainers.slice(0, 5).map(q => <StockCard key={q.symbol} quote={q} compact />)}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <h2><FiArrowDown size={18} className="negative-icon" /> Top Losers</h2>
            <Link to="/search?filter=losers" className="view-all-link">View All</Link>
          </div>
          <div className="stock-list">
            {losers.slice(0, 5).map(q => <StockCard key={q.symbol} quote={q} compact />)}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <h2><FiBarChart2 size={18} /> Most Active</h2>
            <Link to="/search?filter=mostactive" className="view-all-link">View All</Link>
          </div>
          <div className="stock-list">
            {mostActive.slice(0, 5).map(q => <StockCard key={q.symbol} quote={q} compact />)}
          </div>
        </section>
      </div>
    </div>
  );
}
