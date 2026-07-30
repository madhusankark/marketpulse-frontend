import { useRef, useEffect } from 'react';
import { Chart, BarController, LineController, LinearScale, BarElement, LineElement, PointElement, CategoryScale, Tooltip, Filler, TimeSeriesScale } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(BarController, LineController, CandlestickController, LinearScale, BarElement, LineElement, PointElement, CategoryScale, TimeSeriesScale, CandlestickElement, Tooltip, Filler, zoomPlugin);

function prepareData(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const first = new Date(sorted[0].timestamp);
  const last = new Date(sorted[sorted.length - 1].timestamp);
  const isIntraday = Math.abs(last - first) < 86400000;
  const ohlc = sorted.map((d, i) => {
    const t = new Date(d.timestamp);
    return { x: t.getTime(), o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume || 0, date: t };
  });
  const volumes = sorted.map((d, i) => ({ x: ohlc[i].x, y: d.volume || 0 }));
  const rawMax = Math.max(...volumes.map(v => v.y));
  const hasVolume = rawMax > 0 && !isIntraday;
  return { sorted, ohlc, volumes, isIntraday, hasVolume, rawMax };
}

const COLORS = {
  up: '#16a34a', down: '#dc2626', unchanged: '#94a3b8',
  upBg: 'rgba(22, 163, 74, 0.5)', downBg: 'rgba(220, 38, 38, 0.5)',
  line: '#3b82f6', area: 'rgba(59, 130, 246, 0.15)',
  sma20: '#f59e0b', sma50: '#8b5cf6', sma200: '#ef4444',
  ema12: '#06b6d4', ema26: '#ec4899',
  rsi: '#f97316', macd: '#a855f7', signal: '#22c55e'
};

export default function StockChart({ data, symbol = '', change, changePercent, height = 450, chartType = 'candlestick', indicators = null, comparisons = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const oldChart = chartRef.current;
    let savedMin, savedMax;
    if (oldChart && oldChart.scales?.x) {
      savedMin = oldChart.scales.x.min;
      savedMax = oldChart.scales.x.max;
    }

    const prep = prepareData(data);
    if (!prep) return;
    const { sorted, ohlc, volumes, isIntraday, hasVolume, rawMax } = prep;
    const volumeAxisMax = hasVolume ? rawMax * 4 : 1;
    const firstClose = sorted[0].close;
    const lastClose = sorted[sorted.length - 1].close;

    const ctx = canvasRef.current.getContext('2d');
    const existing = Chart.getChart(canvasRef.current);
    if (existing) existing.destroy();
    chartRef.current = null;

    const datasets = [];
    if (chartType === 'candlestick') {
      datasets.push({ type: 'candlestick', label: symbol || '', data: ohlc, color: { up: COLORS.up, down: COLORS.down, unchanged: COLORS.unchanged }, borderColor: { up: COLORS.up, down: COLORS.down, unchanged: COLORS.unchanged }, backgroundColor: { up: COLORS.upBg, down: COLORS.downBg, unchanged: 'rgba(148, 163, 184, 0.3)' }, barPercentage: 0.9, yAxisID: 'y', order: 1 });
    } else {
      const lineData = ohlc.map(o => ({ x: o.x, y: o.c }));
      const lineOpts = {
        type: 'line', label: symbol || '', data: lineData,
        borderColor: COLORS.line, borderWidth: 2,
        tension: 0.3, cubicInterpolationMode: 'monotone',
        pointRadius: isIntraday ? 0 : 1.5,
        yAxisID: 'y', order: 1
      };
      if (chartType === 'area') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(59,130,246,0.35)');
        grad.addColorStop(0.5, 'rgba(59,130,246,0.10)');
        grad.addColorStop(1, 'rgba(59,130,246,0.01)');
        lineOpts.fill = true;
        lineOpts.backgroundColor = grad;
      }
      datasets.push(lineOpts);
    }
    if (hasVolume) {
      const barColors = sorted.map(d => (d.close >= d.open) ? COLORS.upBg : COLORS.downBg);
      const barBorder = sorted.map(d => (d.close >= d.open) ? COLORS.up : COLORS.down);
      datasets.push({ type: 'bar', data: volumes, backgroundColor: barColors, borderColor: barBorder, borderWidth: 0.5, borderRadius: 1, barPercentage: 0.95, yAxisID: 'yVolume', order: 2 });
    }
    if (indicators) {
      const addLine = (label, data, color, yID = 'y') => {
        if (!data || data.length === 0) return;
        const vals = data.map((v, i) => { const pt = ohlc[i]; return pt && v != null ? { x: pt.x, y: v } : null; }).filter(Boolean);
        if (vals.length > 0) datasets.push({ type: 'line', label, data: vals, borderColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: yID, order: 3 });
      };
      addLine('SMA 20', indicators.sma20, COLORS.sma20);
      addLine('SMA 50', indicators.sma50, COLORS.sma50);
      addLine('SMA 200', indicators.sma200, COLORS.sma200);
      addLine('EMA 12', indicators.ema12, COLORS.ema12);
      addLine('EMA 26', indicators.ema26, COLORS.ema26);
      if (indicators.rsi14) {
        const rsiData = indicators.rsi14.map((v, i) => { const pt = ohlc[i]; return pt && v != null ? { x: pt.x, y: v } : null; }).filter(Boolean);
        if (rsiData.length > 0) datasets.push({ type: 'line', label: 'RSI 14', data: rsiData, borderColor: COLORS.rsi, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'yRSI', order: 4 });
      }
    }

    if (comparisons && comparisons.length > 0) {
      comparisons.forEach(comp => {
        if (!comp.data || comp.data.length === 0) return;
        const sorted = [...comp.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const firstClose = sorted[0].close;
        const pts = sorted.map((d) => {
          const t = new Date(d.timestamp);
          return { x: t.getTime(), y: firstClose ? ((d.close - firstClose) / firstClose) * 100 : 0 };
        });
        datasets.push({ type: 'line', label: comp.symbol, data: pts, borderColor: comp.color, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: 'yPct', order: 1 });
      });
    }

    const scales = {
      x: { type: 'timeseries', time: { unit: isIntraday ? 'minute' : 'day', displayFormats: { minute: 'HH:mm', day: 'd MMM' } }, offset: false, grid: { color: 'rgba(226,232,240,0.5)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" }, maxRotation: 0, autoSkip: true, autoSkipPadding: 15, source: 'auto' } },
      y: { position: 'right', grid: { color: 'rgba(226,232,240,0.5)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" }, callback: (val) => `₹${val.toLocaleString('en-IN')}` } }
    };
    if (hasVolume) scales.yVolume = { position: 'left', display: true, min: 0, max: volumeAxisMax, grid: { display: false }, ticks: { display: false } };
    if (indicators && indicators.rsi14) scales.yRSI = { position: 'right', min: 0, max: 100, display: true, grid: { color: 'rgba(226,232,240,0.2)', drawBorder: false }, ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 25, callback: (v) => v + '' } };
    if (comparisons && comparisons.length > 0) scales.yPct = { position: 'left', grid: { drawBorder: false, color: 'rgba(226,232,240,0.3)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => v + '%' } };

    const chart = new Chart(ctx, {
      type: chartType === 'candlestick' ? 'candlestick' : 'line',
      data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: datasets.length > 1, labels: { color: '#94a3b8', font: { size: 10, family: "'Inter', sans-serif" }, boxWidth: 12, padding: 8 } },
          zoom: { limits: { x: { minRange: isIntraday ? 600000 : 86400000 } }, pan: { enabled: true, mode: 'x', threshold: 3 }, zoom: { wheel: { enabled: false }, pinch: { enabled: true }, mode: 'x' } },
          tooltip: {
            enabled: true, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f1f5f9',
            borderColor: '#334155', borderWidth: 1, padding: 14, cornerRadius: 8, displayColors: datasets.length > 1,
            callbacks: {
              title: (ctx) => {
                const raw = ctx[0].raw;
                if (!raw) return '';
                const dt = raw.date || (raw.x ? new Date(raw.x) : null);
                if (!dt || isNaN(dt)) return '';
                return dt.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + (isIntraday ? ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
              },
              beforeBody: () => (symbol || '').toUpperCase(),
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'yVolume') {
                  const v = ctx.parsed?.y;
                  if (v === undefined || v === null) return '';
                  return `Volume: ${v >= 1000000 ? `${(v / 1000000).toFixed(2)}M` : v.toLocaleString('en-IN')}`;
                }
                if (ctx.dataset.yAxisID === 'yRSI') {
                  return `RSI 14: ${ctx.parsed?.y?.toFixed(1)}`;
                }
                if (ctx.dataset.yAxisID === 'yPct') {
                  const v = ctx.parsed?.y;
                  if (v === undefined || v === null) return '';
                  const sign = v >= 0 ? '+' : '';
                  return `${ctx.dataset.label}: ${sign}${v.toFixed(2)}%`;
                }
                if (ctx.raw && ctx.raw.o !== undefined && chartType === 'candlestick') {
                  const r = ctx.raw; const o = r.o, h = r.h, l = r.l, c = r.c, v = r.v;
                  const fmt = (v) => v?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 10 }) || '0';
                  const volFmt = v >= 10000000 ? `${(v / 10000000).toFixed(2)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(2)}L` : v.toLocaleString('en-IN');
                  const ch = change !== undefined ? change : (c - firstClose);
                  const p = changePercent !== undefined ? changePercent : (firstClose ? (ch / firstClose) * 100 : 0);
                  const sign = ch >= 0 ? '+' : '';
                  return [`O: ₹${fmt(o)}  H: ₹${fmt(h)}`, `L: ₹${fmt(l)}  C: ₹${fmt(c)}`, `Vol: ${volFmt}`, `${sign}₹${fmt(ch)} (${sign}${p?.toFixed(2)}%)`];
                }
                if (ctx.parsed) return `${ctx.dataset.label}: ₹${ctx.parsed.y?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                return '';
              }
            }
          }
        },
        scales
      }
    });
    chartRef.current = chart;

    if (savedMin !== undefined && savedMax !== undefined && ohlc.length > 1) {
      const firstX = ohlc[0].x;
      const lastX = ohlc[ohlc.length - 1].x;
      const dataRange = lastX - firstX;
      if (dataRange > 0) {
        const zoomedRange = savedMax - savedMin;
        if (zoomedRange < dataRange * 0.98) {
          const newMin = Math.max(firstX, savedMin);
          const newMax = Math.min(lastX, savedMax);
          if (newMax - newMin > 0 && chart.options.scales?.x) {
            chart.options.scales.x.min = newMin;
            chart.options.scales.x.max = newMax;
            chart.update('none');
          }
        }
      }
    }

    const canvas = canvasRef.current;
    const handleWheel = (e) => {
      e.preventDefault();
      const xScale = chart.scales.x;
      if (!xScale) return;
      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const anchor = xScale.getValueForPixel(cursorX);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const range = xScale.max - xScale.min;
      const newRange = range * factor;
      if (newRange < (isIntraday ? 600000 : 86400000)) return;
      const ratio = (anchor - xScale.min) / range;
      chart.options.scales.x.min = anchor - newRange * ratio;
      chart.options.scales.x.max = chart.options.scales.x.min + newRange;
      chart.update('none');
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [data, symbol, change, changePercent, chartType, indicators, comparisons]);

  if (!Array.isArray(data) || data.length === 0) {
    return <div className="tv-chart-container" style={{ height }}><div className="tv-chart-empty">Loading chart data...</div></div>;
  }

  return <div className="tv-chart-container" style={{ height }}><canvas ref={canvasRef} /></div>;
}
