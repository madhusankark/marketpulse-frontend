import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { stockAPI, notificationAPI } from '../services/api';
import { FiSearch, FiBell, FiUser, FiLogOut, FiMenu, FiX, FiTrendingUp, FiShield, FiSun, FiMoon } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout, isAdmin, theme, toggleTheme } = useAuth();
  const { connected } = useMarket();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    notificationAPI.getUnreadCount().then(r => setUnreadCount(r.data.count)).catch(() => {});
    const iv = setInterval(() => {
      notificationAPI.getUnreadCount().then(r => setUnreadCount(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    const close = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSuggestions(false); }
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fetchSuggestions = async (q) => {
    try {
      const limit = q ? 30 : 500;
      const res = await stockAPI.search(q || '', limit);
      setSuggestions(res.data || []);
      setShowSuggestions(true);
    } catch (_) { setSuggestions([]); }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (symbol) => {
    navigate(`/stock/${symbol}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const toggleNotifs = async () => {
    if (!notifOpen) {
      try {
        const res = await notificationAPI.getAll({ limit: 10 });
        setNotifications(res.data.notifications);
        await notificationAPI.markAllAsRead();
        setUnreadCount(0);
      } catch (_) {}
    }
    setNotifOpen(!notifOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <FiTrendingUp size={24} />
          <span>MarketPulse</span>
          <span className={`status-dot ${connected ? 'connected' : ''}`} />
        </Link>

        <div className="search-wrapper" ref={searchRef}>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by Company name, Index or Symbol..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (!searchQuery && suggestions.length === 0) fetchSuggestions(''); else if (suggestions.length > 0) setShowSuggestions(true); }}
            />
            <FiSearch size={18} />
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-dropdown">
              <div className="search-results">
                {suggestions.map(s => (
                  <div key={s.symbol} className="search-dropdown-item" onClick={() => selectSuggestion(s.symbol)}>
                    <span className="sds-symbol">{s.symbol}</span>
                    <span className="sds-name">{s.name}</span>
                    {s.sector && <span className="sds-sector">{s.sector}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-links">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/sectors" className="nav-link">Sectors</Link>
              <Link to="/screener" className="nav-link">Screener</Link>
              <Link to="/portfolio" className="nav-link">Portfolio</Link>
              <Link to="/watchlists" className="nav-link">Watchlists</Link>
              <Link to="/alerts" className="nav-link">Alerts</Link>
              {isAdmin && (
                <Link to="/admin" className="nav-link admin-link"><FiShield size={14} /> Admin</Link>
              )}

              <button className="icon-btn theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </button>
              <div className="notif-container" ref={notifRef}>
                <button className="icon-btn" onClick={toggleNotifs}>
                  <FiBell size={18} />
                  {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className="notif-dropdown">
                    <h4>Notifications</h4>
                    {notifications.length === 0 ? (
                      <p className="notif-empty">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                          <strong>{n.title}</strong>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleString()}</small>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="user-menu" ref={userMenuRef}>
                <button className="icon-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  {user.avatar ? <img src={user.avatar} alt="" className="nav-avatar" /> : <FiUser size={18} />}
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <Link to="/profile" className="dropdown-link" onClick={() => setUserMenuOpen(false)}><FiUser size={14} /> My Profile</Link>
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                    <button onClick={() => { setUserMenuOpen(false); logout(); navigate('/login'); }} className="logout-btn">
                      <FiLogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/sectors" className="nav-link">Sectors</Link>
              <Link to="/screener" className="nav-link">Screener</Link>
              <button className="icon-btn theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
              </button>
              <span className="nav-spacer" />
              <Link to="/register" className="nav-btn">Get Started</Link>
            </>
          )}
        </div>

        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/sectors" onClick={() => setMobileOpen(false)}>Sectors</Link>
              <Link to="/screener" onClick={() => setMobileOpen(false)}>Screener</Link>
              <Link to="/portfolio" onClick={() => setMobileOpen(false)}>Portfolio</Link>
              <Link to="/watchlists" onClick={() => setMobileOpen(false)}>Watchlists</Link>
              <Link to="/alerts" onClick={() => setMobileOpen(false)}>Alerts</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)}>Admin</Link>}
              <button onClick={() => { setMobileOpen(false); toggleTheme(); }}>
                {theme === 'light' ? <FiMoon size={14} /> : <FiSun size={14} />} {theme === 'light' ? 'Dark' : 'Light'} Mode
              </button>
              <button onClick={() => { logout(); navigate('/login'); setMobileOpen(false); }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/sectors" onClick={() => setMobileOpen(false)}>Sectors</Link>
              <Link to="/screener" onClick={() => setMobileOpen(false)}>Screener</Link>
              <button onClick={() => { setMobileOpen(false); toggleTheme(); }}>
                {theme === 'light' ? <FiMoon size={14} /> : <FiSun size={14} />} {theme === 'light' ? 'Dark' : 'Light'} Mode
              </button>
              <Link to="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
