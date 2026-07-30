import { Link } from 'react-router-dom';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

export default function StockCard({ quote, compact = false }) {
  if (!quote) return null;
  const up = quote.changePercent >= 0;
  const fmt = (v) => v?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 }) ?? '—';
  const fmtPrice = (v) => v?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 }) ?? '—';

  if (compact) {
    return (
      <Link to={`/stock/${quote.symbol}`} className="stock-card compact">
        <div className="stock-card-header">
          <span className="stock-symbol">{quote.symbol}</span>
          <span className={`stock-change ${up ? 'positive' : 'negative'}`}>
            {up ? '+' : ''}{fmt(quote.changePercent)}%
          </span>
        </div>
        <span className="stock-price">₹{fmtPrice(quote.lastPrice)}</span>
      </Link>
    );
  }

  return (
    <Link to={`/stock/${quote.symbol}`} className="stock-card">
      <div className="stock-card-header">
        <div>
          <span className="stock-symbol">{quote.symbol}</span>
          <span className="stock-name">{quote.name}</span>
        </div>
        <span className={`stock-change ${up ? 'positive' : 'negative'}`}>
          {up ? <FiTrendingUp size={14} /> : <FiTrendingDown size={14} />}
          {up ? '+' : ''}{fmt(quote.changePercent)}%
        </span>
      </div>

      <div className="stock-card-body">
        <span className="stock-price large">₹{fmtPrice(quote.lastPrice)}</span>
        <span className={`stock-change-value ${up ? 'positive' : 'negative'}`}>
          {up ? '+' : ''}₹{fmt(quote.change)}
        </span>
      </div>

      <div className="stock-card-meta">
        <div><label>Open</label><span>₹{fmtPrice(quote.open)}</span></div>
        <div><label>High</label><span>₹{fmtPrice(quote.dayHigh)}</span></div>
        <div><label>Low</label><span>₹{fmtPrice(quote.dayLow)}</span></div>
        <div><label>Volume</label><span>{quote.volume >= 1000000 ? `${(quote.volume / 1000000).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}M` : (quote.volume || 0).toLocaleString('en-IN')}</span></div>
      </div>
    </Link>
  );
}
