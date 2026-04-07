import { useEffect, useRef, useCallback } from 'react';
import { makeWsUrl } from '../services/api';

/**
 * useWebSocket
 * Opens a WebSocket to /ws/{sessionId} and calls onMessage with parsed JSON.
 * Returns send() to push control messages.
 */
export function useWebSocket(sessionId, onMessage) {
  const wsRef = useRef(null);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;

  useEffect(() => {
    if (!sessionId) return;

    const connect = () => {
      const url = makeWsUrl(sessionId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] connected', sessionId);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onMsgRef.current?.(data);
        } catch {
          /* ignore malformed */
        }
      };

      ws.onclose = (e) => {
        console.log('[WS] closed', e.code);
      };

      ws.onerror = (err) => {
        console.error('[WS] error', err);
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [sessionId]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  return { send };
}
