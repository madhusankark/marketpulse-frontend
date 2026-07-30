import { useState, useEffect, useRef } from 'react';
import { alertAPI, stockAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiBell, FiBellOff, FiPlus, FiTrash2, FiCheck, FiClock } from 'react-icons/fi';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', symbol: '', type: 'price_above', value: '',
    logic: 'OR', cooldownMinutes: 60, notifyVia: ['in_app']
  });
  const [stockQuery, setStockQuery] = useState('');
  const [stockSuggestions, setStockSuggestions] = useState([]);
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const stockRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [aRes, hRes] = await Promise.all([
        alertAPI.getAll(),
        alertAPI.getHistory(1, 20)
      ]);
      setAlerts(aRes.data);
      setHistory(hRes.data.history);
      setHistoryMeta({ page: hRes.data.page, pages: hRes.data.pages, total: hRes.data.total });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadHistory = async (page) => {
    try {
      const res = await alertAPI.getHistory(page, 20);
      setHistory(res.data.history);
      setHistoryMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) { console.error(err); }
  };

  const createAlert = async (e) => {
    e.preventDefault();
    try {
      await alertAPI.create({
        name: form.name || `${form.symbol} Alert`,
        symbol: form.symbol.toUpperCase(),
        rules: [{ type: form.type, value: parseFloat(form.value) }],
        logic: form.logic,
        cooldownMinutes: form.cooldownMinutes,
        notifyVia: form.notifyVia
      });
      toast.success('Alert created');
      setShowCreate(false);
      setForm({ name: '', symbol: '', type: 'price_above', value: '', logic: 'OR', cooldownMinutes: 60, notifyVia: ['in_app'] });
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const toggleAlert = async (id) => {
    try {
      const res = await alertAPI.toggle(id);
      setAlerts(alerts.map(a => a._id === id ? res.data : a));
      toast.success('Alert toggled');
    } catch (err) { toast.error(err.message); }
  };

  const deleteAlert = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await alertAPI.remove(id);
      setAlerts(alerts.filter(a => a._id !== id));
      toast.success('Alert deleted');
    } catch (err) { toast.error(err.message); }
  };

  const acknowledgeHistory = async (id) => {
    try {
      await alertAPI.acknowledgeHistory(id);
      setHistory(history.map(h => h._id === id ? { ...h, acknowledged: true } : h));
    } catch (err) { toast.error(err.message); }
  };

  const fetchSuggestions = async (q) => {
    if (!q || q.length < 1) { setStockSuggestions([]); return; }
    try {
      const res = await stockAPI.search(q, 8);
      setStockSuggestions(res.data || []);
      setShowStockSuggestions(true);
    } catch (_) { setStockSuggestions([]); }
  };

  const handleStockChange = (e) => {
    const val = e.target.value;
    setStockQuery(val);
    setForm({ ...form, symbol: val });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectStock = (s) => {
    setStockQuery(s.symbol);
    setForm({ ...form, symbol: s.symbol });
    setShowStockSuggestions(false);
    setStockSuggestions([]);
  };

  useEffect(() => {
    if (!showCreate) {
      setStockQuery('');
      setStockSuggestions([]);
      setShowStockSuggestions(false);
    }
  }, [showCreate]);

  useEffect(() => {
    if (!showCreate) return;
    const close = (e) => {
      if (stockRef.current && !stockRef.current.contains(e.target)) {
        setShowStockSuggestions(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showCreate]);

  const formatRuleType = (type) => {
    const map = {
      price_above: 'Price Above', price_below: 'Price Below',
      pct_change_above: '% Change Above', pct_change_below: '% Change Below',
      volume_spike: 'Volume Spike', week52_high: '52W High', week52_low: '52W Low'
    };
    return map[type] || type;
  };

  if (loading) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /><p>Loading alerts...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiBell size={22} /> Alert Manager</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <FiPlus size={14} /> New Alert
        </button>
      </div>

      <div className="filter-tabs">
        <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          Active Alerts ({alerts.length})
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <FiClock size={14} /> Alert History
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="empty-state">
              <FiBellOff size={48} />
              <h3>No alerts set</h3>
              <p>Create an alert to get notified when conditions are met.</p>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert._id} className={`alert-card ${alert.isActive ? 'active' : 'inactive'}`}>
                <div className="alert-card-header">
                  <div>
                    <h3>{alert.name}</h3>
                    <span className="alert-symbol">{alert.symbol}</span>
                  </div>
                  <div className="alert-actions">
                    <button className={`btn-icon ${alert.isActive ? 'active' : ''}`} onClick={() => toggleAlert(alert._id)}>
                      {alert.isActive ? <FiBell size={16} /> : <FiBellOff size={16} />}
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteAlert(alert._id)}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="alert-rules">
                  {alert.rules?.map((rule, i) => (
                    <span key={i} className="alert-rule-tag">
                      {formatRuleType(rule.type)}: {rule.type.includes('volume') ? `${(rule.value / 1000000).toFixed(1)}M` : rule.value}
                    </span>
                  ))}
                  <span className="alert-logic">{alert.logic}</span>
                </div>
                <div className="alert-card-footer">
                  <span>Cooldown: {alert.cooldownMinutes}min</span>
                  {alert.lastTriggered && <span>Last triggered: {new Date(alert.lastTriggered).toLocaleString()}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="alert-history">
          {history.length === 0 ? (
            <div className="empty-state"><FiClock size={48} /><h3>No alert history</h3></div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Alert</th>
                    <th>Symbol</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h._id} className={h.acknowledged ? '' : 'unread'}>
                      <td>{new Date(h.triggeredAt).toLocaleString()}</td>
                      <td>{h.alert?.name || 'N/A'}</td>
                      <td className="symbol-cell">{h.symbol}</td>
                      <td className="msg-cell">{h.message}</td>
                      <td>{h.acknowledged ? <span className="badge-success">Acknowledged</span> : <span className="badge-warning">New</span>}</td>
                      <td>
                        {!h.acknowledged && (
                          <button className="btn-icon" onClick={() => acknowledgeHistory(h._id)}>
                            <FiCheck size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyMeta.pages > 1 && (
                <div className="pagination">
                  <button disabled={historyMeta.page <= 1} onClick={() => { setHistoryPage(historyMeta.page - 1); loadHistory(historyMeta.page - 1); }}>Prev</button>
                  <span>Page {historyMeta.page} of {historyMeta.pages}</span>
                  <button disabled={historyMeta.page >= historyMeta.pages} onClick={() => { setHistoryPage(historyMeta.page + 1); loadHistory(historyMeta.page + 1); }}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create Alert</h3>
            <form onSubmit={createAlert}>
              <div className="form-group">
                <label>Alert Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., RELIANCE Price Alert" />
              </div>
              <div className="form-group" ref={stockRef} style={{ position: 'relative' }}>
                <label>Stock Symbol</label>
                <input type="text" required value={stockQuery}
                  onChange={handleStockChange}
                  onFocus={() => { if (stockSuggestions.length > 0) setShowStockSuggestions(true); }}
                  placeholder="Search stock by symbol or name" />
                {showStockSuggestions && stockSuggestions.length > 0 && (
                  <div className="search-dropdown">
                    {stockSuggestions.map(s => (
                      <div key={s.symbol} className="search-dropdown-item" onClick={() => selectStock(s)}>
                        <span className="sds-symbol">{s.symbol}</span>
                        <span className="sds-name">{s.name}</span>
                        {s.sector && <span className="sds-sector">{s.sector}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Condition Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
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
                <label>Threshold Value</label>
                <input type="number" step="0.01" required value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g., 2500" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Logic</label>
                  <select value={form.logic} onChange={(e) => setForm({ ...form, logic: e.target.value })}>
                    <option value="OR">OR (any rule triggers)</option>
                    <option value="AND">AND (all rules trigger)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cooldown (min)</label>
                  <input type="number" value={form.cooldownMinutes}
                    onChange={(e) => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) })} min={5} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="emailNotify" checked={form.notifyVia.includes('email')}
                  onChange={(e) => setForm({
                    ...form,
                    notifyVia: e.target.checked ? ['in_app', 'email'] : ['in_app']
                  })} style={{ width: 18, height: 18, accentColor: '#FF6B35', cursor: 'pointer' }} />
                <label htmlFor="emailNotify" style={{ margin: 0, cursor: 'pointer' }}>Send email notification</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
