import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiShield, FiUsers, FiBell, FiFileText, FiActivity, FiServer, FiBarChart2, FiTrendingUp, FiTrendingDown, FiMinus, FiClock, FiCpu } from 'react-icons/fi';

export default function Admin() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [marketOverview, setMarketOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userPage, setUserPage] = useState(1);
  const [userMeta, setUserMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [dashRes, healthRes, marketRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getHealth(),
        adminAPI.getMarketOverview()
      ]);
      setDashboard(dashRes.data);
      setHealth(healthRes.data);
      setMarketOverview(marketRes.data);
    } catch (err) { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const loadUsers = async (page = 1) => {
    try {
      const res = await adminAPI.getUsers({ page, limit: 20 });
      setUsers(res.data.users);
      setUserMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) { console.error(err); }
  };

  const loadLogs = async () => {
    try {
      const res = await adminAPI.getLogs({ limit: 50 });
      setLogs(res.data.logs);
    } catch (err) { console.error(err); }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      await adminAPI.updateUserStatus(id, !currentStatus);
      setUsers(users.map(u => u._id === id ? { ...u, isActive: !currentStatus } : u));
      toast.success('User status updated');
    } catch (err) { toast.error(err.message); }
  };

  const changeUserRole = async (id, role) => {
    try {
      await adminAPI.updateUserRole(id, role);
      setUsers(users.map(u => u._id === id ? { ...u, role } : u));
      toast.success('User role updated');
    } catch (err) { toast.error(err.message); }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'logs' && logs.length === 0) loadLogs();
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) {
    return <div className="page-container"><div className="loading-spinner"><div className="spinner" /><p>Loading admin panel...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiShield size={22} /> Admin Portal</h1>
      </div>

      <div className="filter-tabs">
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => switchTab('dashboard')}>
          <FiActivity size={14} /> Dashboard
        </button>
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => switchTab('users')}>
          <FiUsers size={14} /> Users
        </button>
        <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => switchTab('logs')}>
          <FiFileText size={14} /> System Logs
        </button>
      </div>

      {activeTab === 'dashboard' && dashboard && (
        <div className="admin-dashboard">
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <FiUsers size={24} />
              <div>
                <span className="admin-stat-value">{dashboard.users?.total}</span>
                <span className="admin-stat-label">Total Users</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <FiUsers size={24} className="active-icon" />
              <div>
                <span className="admin-stat-value">{dashboard.users?.active}</span>
                <span className="admin-stat-label">Active Users</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <FiBell size={24} />
              <div>
                <span className="admin-stat-value">{dashboard.alerts?.active}</span>
                <span className="admin-stat-label">Active Alerts</span>
              </div>
            </div>
            <div className="admin-stat-card">
              <FiActivity size={24} />
              <div>
                <span className="admin-stat-value">{dashboard.alerts?.triggeredToday}</span>
                <span className="admin-stat-label">Triggered Today</span>
              </div>
            </div>
            {health && (
              <>
                <div className="admin-stat-card">
                  <FiClock size={24} />
                  <div>
                    <span className="admin-stat-value">{formatUptime(health.uptime)}</span>
                    <span className="admin-stat-label">Server Uptime</span>
                  </div>
                </div>
                <div className="admin-stat-card">
                  <FiCpu size={24} />
                  <div>
                    <span className="admin-stat-value">{health.memory?.rss}</span>
                    <span className="admin-stat-label">Memory (RSS)</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* System Health */}
          {health && (
            <div className="admin-section">
              <h3><FiServer size={16} /> System Health</h3>
              <div className="health-grid">
                <div className="health-item">
                  <span className={`status-indicator ${health.redis === 'connected' ? 'connected' : 'disconnected'}`} />
                  <span className="health-key">Redis</span>
                  <span className="health-value">{health.redis}</span>
                </div>
                <div className="health-item">
                  <span className="status-indicator connected" />
                  <span className="health-key">MongoDB</span>
                  <span className="health-value">connected</span>
                </div>
                <div className="health-item">
                  <span className="status-indicator connected" />
                  <span className="health-key">Node.js</span>
                  <span className="health-value">{health.nodeVersion}</span>
                </div>
                <div className="health-item">
                  <span className="status-indicator connected" />
                  <span className="health-key">Platform</span>
                  <span className="health-value">{health.platform}</span>
                </div>
                <div className="health-item">
                  <span className="status-indicator connected" />
                  <span className="health-key">Heap Used</span>
                  <span className="health-value">{health.memory?.heapUsed} / {health.memory?.heapTotal}</span>
                </div>
                <div className="health-item">
                  <span className="status-indicator connected" />
                  <span className="health-key">Stocks Tracked</span>
                  <span className="health-value">{marketOverview?.totalStocksTracked || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Market Overview */}
          {marketOverview && (
            <div className="admin-section">
              <h3><FiBarChart2 size={16} /> Market Overview</h3>
              <div className="market-summary">
                <div className="market-stat">
                  <FiTrendingUp size={18} className="positive" />
                  <span className="market-stat-value">{marketOverview.gainersToday}</span>
                  <span className="market-stat-label">Gainers</span>
                </div>
                <div className="market-stat">
                  <FiTrendingDown size={18} className="negative" />
                  <span className="market-stat-value">{marketOverview.losersToday}</span>
                  <span className="market-stat-label">Losers</span>
                </div>
                <div className="market-stat">
                  <FiMinus size={18} />
                  <span className="market-stat-value">{marketOverview.unchanged}</span>
                  <span className="market-stat-label">Unchanged</span>
                </div>
              </div>
              {marketOverview.topIndices && marketOverview.topIndices.length > 0 && (
                <table className="data-table" style={{ marginTop: 16 }}>
                  <thead>
                    <tr><th>Index</th><th>Last Price</th><th>Change</th><th>Change %</th></tr>
                  </thead>
                  <tbody>
                    {marketOverview.topIndices.map(idx => (
                      <tr key={idx.symbol || idx.name}>
                        <td>{idx.name || idx.symbol}</td>
                        <td>₹{idx.lastPrice?.toLocaleString('en-IN') || '-'}</td>
                        <td className={idx.change >= 0 ? 'positive' : 'negative'}>{idx.change ?? '-'}</td>
                        <td className={idx.changePercent >= 0 ? 'positive' : 'negative'}>{idx.changePercent ?? '-'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="market-timestamp">Last updated: {new Date(marketOverview.lastUpdated).toLocaleString()}</p>
            </div>
          )}

          <div className="admin-section">
            <h3>Recent System Logs</h3>
            <table className="data-table">
              <thead>
                <tr><th>Time</th><th>Level</th><th>Action</th><th>Details</th></tr>
              </thead>
              <tbody>
                {dashboard.recentLogs?.map(log => (
                  <tr key={log._id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td><span className={`badge-${log.level}`}>{log.level}</span></td>
                    <td>{log.action}</td>
                    <td>{typeof log.details === 'object' ? JSON.stringify(log.details).substring(0, 80) : log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select value={user.role} onChange={(e) => changeUserRole(user._id, e.target.value)}
                      className="inline-select">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge-${user.isActive ? 'success' : 'danger'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                  <td>
                    <button className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleUserStatus(user._id, user.isActive)}>
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {userMeta.pages > 1 && (
            <div className="pagination">
              <button disabled={userPage <= 1} onClick={() => { setUserPage(userPage - 1); loadUsers(userPage - 1); }}>Prev</button>
              <span>Page {userMeta.page} of {userMeta.pages}</span>
              <button disabled={userPage >= userMeta.pages} onClick={() => { setUserPage(userPage + 1); loadUsers(userPage + 1); }}>Next</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="admin-section">
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Level</th><th>Action</th><th>User</th><th>IP</th><th>Duration</th></tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td><span className={`badge-${log.level}`}>{log.level}</span></td>
                  <td>{log.action}</td>
                  <td>{log.user?.email || 'System'}</td>
                  <td>{log.ip}</td>
                  <td>{log.duration ? `${log.duration}ms` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}