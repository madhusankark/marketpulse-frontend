import { useState, useEffect, useRef } from 'react';
import { stockAPI } from '../services/api';
import { FiTrendingUp } from 'react-icons/fi';

export default function ProfitTicker() {
  const [gainers, setGainers] = useState([]);
  const tickerRef = useRef(null);

  useEffect(() => {
    const fetchGainers = async () => {
      try {
        const res = await stockAPI.getGainers(20);
        if (res.data && res.data.length > 0) {
          setGainers(res.data);
        }
      } catch (_) {}
    };
    fetchGainers();
    const interval = setInterval(fetchGainers, 120000);
    return () => clearInterval(interval);
  }, []);

  if (gainers.length === 0) return null;

  const items = (
    <>
      {gainers.map((s, i) => (
        <span key={`a-${i}`} className="ticker-item">
          <span className="ticker-symbol">{s.symbol}</span>
          <span className="ticker-price">₹{s.lastPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          <span className="ticker-change">
            <FiTrendingUp size={11} />
            +{s.changePercent?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}%
          </span>
          <span className="ticker-dot">•</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="profit-ticker">
      <div className="ticker-label">
        <FiTrendingUp size={13} /> GAINERS
      </div>
      <div className="ticker-track">
        <div className="ticker-scroll" ref={tickerRef}>
          {items}
          {items}
        </div>
      </div>
    </div>
  );
}
