import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { stockAPI } from '../services/api';

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [indices, setIndices] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const fetchingRef = useRef(false);

  const fetchIndices = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await stockAPI.getIndices();
      if (res.data && res.data.length > 0) {
        setIndices(res.data);
      }
    } catch (err) {
      // silent
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const fetchQuote = useCallback(async (symbol) => {
    try {
      const res = await stockAPI.getQuote(symbol);
      setQuotes(prev => ({ ...prev, [symbol]: res.data }));
      return res.data;
    } catch (err) {
      // silent
      return null;
    }
  }, []);

  useEffect(() => {
    fetchIndices();

    const refreshInterval = setInterval(fetchIndices, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchIndices]);

  useEffect(() => {
    const envUrl = (typeof window !== 'undefined' && window.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || '';
    let socketUrl = envUrl ? envUrl.replace(/\/+$/, '') : '';

    if (!socketUrl && typeof window !== 'undefined') {
      const host = window.location.hostname;
      const port = window.location.port;
      if (host === 'localhost' || host === '127.0.0.1') {
        if (port === '3000' || port === '3001') {
          socketUrl = 'http://localhost:5000';
        }
      }
      if (!socketUrl) {
        socketUrl = window.location.origin;
      }
    }

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
      forceNew: false
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {});
    socket.on('reconnect_error', () => {});

    socket.on('marketUpdate', (data) => {
      if (data.indices && data.indices.length > 0) {
        setIndices(data.indices);
      }
    });

    socket.on('priceUpdate', (quote) => {
      setQuotes(prev => ({ ...prev, [quote.symbol]: quote }));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [fetchIndices]);

  const subscribeQuote = useCallback((symbol) => {
    socketRef.current?.emit('subscribeQuote', symbol);
  }, []);

  const unsubscribeQuote = useCallback((symbol) => {
    socketRef.current?.emit('unsubscribeQuote', symbol);
  }, []);

  const joinRoom = useCallback((room) => {
    socketRef.current?.emit('join', room);
  }, []);

  const leaveRoom = useCallback((room) => {
    socketRef.current?.emit('leave', room);
  }, []);

  return (
    <MarketContext.Provider value={{
      indices, quotes, connected,
      fetchIndices, fetchQuote,
      subscribeQuote, unsubscribeQuote,
      joinRoom, leaveRoom
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within MarketProvider');
  return context;
};
