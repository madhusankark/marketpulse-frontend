import { useRef, useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { FiTrendingUp, FiTrendingDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function IndexBar() {
  const { indices } = useMarket();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [indices]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <div className="index-bar">
      {indices.length > 0 && canScrollLeft && (
        <button className="index-scroll-btn index-scroll-left" onClick={() => scroll(-1)} aria-label="Scroll left">
          <FiChevronLeft size={16} />
        </button>
      )}

      <div className="index-bar-inner" ref={scrollRef}>
        {(indices.length === 0
          ? Array.from({ length: 8 }, (_, i) => ({ symbol: `skeleton-${i}`, name: '------' }))
          : indices
        ).map((idx) => (
          <div
            key={idx.symbol}
            className={`index-item ${indices.length === 0 ? 'skeleton' : idx.changePercent >= 0 ? 'positive' : 'negative'}`}
          >
            <span className="index-name">{idx.name}</span>
            {indices.length > 0 ? (
              <>
                <span className="index-value">{idx.currentValue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                <span className="index-change">
                  {idx.changePercent >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                  {idx.change >= 0 ? '+' : ''}{idx.change?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })} ({idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 })}%)
                </span>
              </>
            ) : (
              <span className="index-value">Loading...</span>
            )}
          </div>
        ))}
      </div>

      {indices.length > 0 && canScrollRight && (
        <button className="index-scroll-btn index-scroll-right" onClick={() => scroll(1)} aria-label="Scroll right">
          <FiChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
