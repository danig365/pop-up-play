// Single shared WebSocket connection (per browser tab) for real-time
// VideoSignal push — see server.js's `wss` (path /ws). This exists purely
// as a faster, additive path: IncomingCallDetector.jsx and VideoCall.jsx
// both keep their existing REST poll as a fallback for whenever this isn't
// connected, so a dropped/blocked socket degrades to already-proven
// behavior rather than breaking anything.
import { useEffect, useState } from 'react';

let socket = null;
let connected = false;
let reconnectTimer = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
const messageListeners = new Set();
const statusListeners = new Set();

function notifyStatus() {
  statusListeners.forEach((cb) => cb(connected));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectVideoSignalSocket();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

export function connectVideoSignalSocket() {
  if (typeof window === 'undefined') return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const token = localStorage.getItem('popup_auth_token');
  if (!token) return;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${wsProtocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    connected = true;
    reconnectDelay = 1000;
    notifyStatus();
  };

  socket.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    messageListeners.forEach((cb) => cb(data));
  };

  socket.onclose = () => {
    connected = false;
    notifyStatus();
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose fires right after in browsers — nothing extra needed here.
  };
}

export function disconnectVideoSignalSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  connected = false;
}

// Subscribe to incoming { type: 'video_signal', signal } push messages.
export function subscribeToVideoSignals(callback) {
  messageListeners.add(callback);
  return () => messageListeners.delete(callback);
}

export function isVideoSignalSocketConnected() {
  return connected;
}

// React hook wrapper — components use this to conditionally disable their
// REST poll while the socket is healthy.
export function useVideoSignalSocketConnected() {
  const [isConnected, setIsConnected] = useState(connected);
  useEffect(() => {
    setIsConnected(connected);
    statusListeners.add(setIsConnected);
    return () => statusListeners.delete(setIsConnected);
  }, []);
  return isConnected;
}
