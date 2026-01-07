'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { CanvasAddon } from '@xterm/addon-canvas';
import type { RalphLoopConfig } from '@vibecompany/247-shared';
import { TERMINAL_THEME, WS_RECONNECT_BASE_DELAY, WS_RECONNECT_MAX_DELAY } from '../constants';

interface UseTerminalConnectionProps {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  agentUrl: string;
  project: string;
  sessionName: string;
  environmentId?: string;
  ralphConfig?: RalphLoopConfig;
  onSessionCreated?: (name: string) => void;
  onCopySuccess: () => void;
}

export function useTerminalConnection({
  terminalRef,
  agentUrl,
  project,
  sessionName,
  environmentId,
  ralphConfig,
  onSessionCreated,
  onCopySuccess,
}: UseTerminalConnectionProps) {
  const [connected, setConnected] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [connectionState, setConnectionState] = useState<
    'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const isSelectingRef = useRef(false);
  const isPastingRef = useRef(false);

  // Reconnection tracking
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(WS_RECONNECT_BASE_DELAY);
  const intentionalCloseRef = useRef<boolean>(false);
  const isReconnectRef = useRef<boolean>(false);

  const scrollToBottom = useCallback(() => {
    xtermRef.current?.scrollToBottom();
  }, []);

  const copySelection = useCallback(() => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        onCopySuccess();
      }
    }
  }, [onCopySuccess]);

  const startClaude = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start-claude' }));
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    let cancelled = false;
    let term: XTerm | null = null;
    let ws: WebSocket | null = null;
    let handleResize: (() => void) | null = null;
    let handleMouseUp: (() => void) | null = null;
    let handlePaste: ((e: ClipboardEvent) => void) | null = null;
    let termElement: HTMLElement | null = null;

    const connectTimeout = setTimeout(() => {
      if (cancelled || !terminalRef.current) return;

      // Initialize xterm.js
      term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
        fontWeight: '400',
        fontWeightBold: '600',
        letterSpacing: 0,
        lineHeight: 1.2,
        scrollback: 15000,
        scrollSensitivity: 1,
        fastScrollSensitivity: 5,
        fastScrollModifier: 'alt',
        smoothScrollDuration: 100,
        cursorStyle: 'bar',
        cursorWidth: 2,
        allowProposedApi: true,
        theme: TERMINAL_THEME,
      });

      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.loadAddon(searchAddon);
      term.open(terminalRef.current);

      // Copy handler
      const currentTermForKeys = term;
      term.attachCustomKeyEventHandler((event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key === 'c' &&
          currentTermForKeys.hasSelection()
        ) {
          const selection = currentTermForKeys.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            onCopySuccess();
          }
          return false;
        }
        return true;
      });

      term.loadAddon(new CanvasAddon());
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;

      // Mouse selection tracking
      const handleMouseDown = () => {
        isSelectingRef.current = true;
      };
      handleMouseUp = () => {
        setTimeout(() => {
          isSelectingRef.current = false;
        }, 100);
      };
      term.element?.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);

      // Paste handler
      handlePaste = (e: ClipboardEvent) => {
        const clipboardData = e.clipboardData;
        if (!clipboardData) return;

        const hasImage = Array.from(clipboardData.items).some((item) =>
          item.type.startsWith('image/')
        );
        if (hasImage) return;

        const text = clipboardData.getData('text');
        if (text && ws && ws.readyState === WebSocket.OPEN) {
          e.preventDefault();
          isPastingRef.current = true;
          ws.send(JSON.stringify({ type: 'input', data: text }));
          setTimeout(() => {
            isPastingRef.current = false;
          }, 50);
        }
      };
      termElement = term.element ?? null;
      termElement?.addEventListener('paste', handlePaste);

      // Scroll tracking
      term.onScroll(() => {
        if (!term || isSelectingRef.current) return;
        const buffer = term.buffer.active;
        setIsAtBottom(buffer.viewportY >= buffer.baseY);
      });

      // WebSocket connection
      const wsProtocol = agentUrl.includes('localhost') ? 'ws' : 'wss';
      let wsUrl = `${wsProtocol}://${agentUrl}/terminal?project=${encodeURIComponent(project)}&session=${encodeURIComponent(sessionName)}`;
      if (environmentId) wsUrl += `&environment=${encodeURIComponent(environmentId)}`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      const currentTerm = term;
      const currentWs = ws;

      currentWs.onopen = () => {
        if (cancelled) return;
        setConnected(true);
        setConnectionState('connected');
        reconnectDelayRef.current = WS_RECONNECT_BASE_DELAY;

        if (!isReconnectRef.current) {
          currentTerm.write('\x1b[38;5;245m┌─ Connected to ' + agentUrl + ' ─┐\x1b[0m\r\n\r\n');
        } else {
          currentTerm.write('\x1b[38;5;245m┌─ Reconnected ─┐\x1b[0m\r\n');
        }

        currentWs.send(
          JSON.stringify({ type: 'resize', cols: currentTerm.cols, rows: currentTerm.rows })
        );
        if (onSessionCreated && sessionName) onSessionCreated(sessionName);

        if (ralphConfig) {
          currentTerm.write('\x1b[38;5;141m🔄 Starting Ralph Loop...\x1b[0m\r\n');
          currentTerm.write(
            '\x1b[38;5;245m   Prompt: ' +
              ralphConfig.prompt.substring(0, 50) +
              (ralphConfig.prompt.length > 50 ? '...' : '') +
              '\x1b[0m\r\n'
          );
          if (ralphConfig.maxIterations)
            currentTerm.write(
              '\x1b[38;5;245m   Max iterations: ' + ralphConfig.maxIterations + '\x1b[0m\r\n'
            );
          if (ralphConfig.completionPromise)
            currentTerm.write(
              '\x1b[38;5;245m   Completion promise: ' +
                ralphConfig.completionPromise +
                '\x1b[0m\r\n'
            );
          currentTerm.write('\r\n');
          currentWs.send(JSON.stringify({ type: 'start-claude-ralph', config: ralphConfig }));
        }
      };

      currentWs.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'pong') return;
          if (msg.type === 'history') {
            currentTerm.clear();
            currentTerm.write(msg.data);
            currentTerm.scrollToBottom();
            return;
          }
        } catch {
          currentTerm.write(event.data);
        }
      };

      currentWs.onclose = () => {
        if (cancelled) return;
        setConnected(false);

        if (intentionalCloseRef.current) {
          setConnectionState('disconnected');
          currentTerm.write('\r\n\x1b[38;5;245m└─ Disconnected ─┘\x1b[0m\r\n');
          return;
        }

        setConnectionState('disconnected');
        currentTerm.write('\r\n\x1b[38;5;245m└─ Disconnected ─┘\x1b[0m\r\n');

        const currentDelay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(currentDelay * 2, WS_RECONNECT_MAX_DELAY);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (cancelled || intentionalCloseRef.current) return;
          setConnectionState('reconnecting');
          isReconnectRef.current = true;

          let newWsUrl = `${wsProtocol}://${agentUrl}/terminal?project=${encodeURIComponent(project)}&session=${encodeURIComponent(sessionName)}`;
          if (environmentId) newWsUrl += `&environment=${encodeURIComponent(environmentId)}`;

          const newWs = new WebSocket(newWsUrl);
          ws = newWs;
          wsRef.current = newWs;
          newWs.onopen = currentWs.onopen;
          newWs.onmessage = currentWs.onmessage;
          newWs.onclose = currentWs.onclose;
          newWs.onerror = currentWs.onerror;
        }, currentDelay);
      };

      currentWs.onerror = (err) => {
        if (cancelled) return;
        console.error('WebSocket error:', err);
        currentTerm.write('\r\n\x1b[31m✗ Connection error\x1b[0m\r\n');
      };

      currentTerm.onData((data) => {
        if (isPastingRef.current) return;
        if (currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({ type: 'input', data }));
        }
      });

      handleResize = () => {
        fitAddon.fit();
        if (currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(
            JSON.stringify({ type: 'resize', cols: currentTerm.cols, rows: currentTerm.rows })
          );
        }
      };
      window.addEventListener('resize', handleResize);
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(connectTimeout);
      intentionalCloseRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      reconnectDelayRef.current = WS_RECONNECT_BASE_DELAY;
      isReconnectRef.current = false;

      if (handleResize) window.removeEventListener('resize', handleResize);
      if (handleMouseUp) window.removeEventListener('mouseup', handleMouseUp);
      if (handlePaste && termElement) termElement.removeEventListener('paste', handlePaste);

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'Component unmounting');
      }

      if (wsRef.current === ws) wsRef.current = null;
      if (term) {
        try {
          term.dispose();
        } catch {
          /* ignore */
        }
      }
      if (xtermRef.current === term) xtermRef.current = null;
      if (fitAddonRef.current) fitAddonRef.current = null;
      if (searchAddonRef.current) searchAddonRef.current = null;
    };
    // Note: onSessionCreated, onCopySuccess, and terminalRef are intentionally excluded
    // from deps - they are refs/callbacks that shouldn't cause reconnection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentUrl, project, sessionName, environmentId, ralphConfig]);

  return {
    connected,
    connectionState,
    isAtBottom,
    xtermRef,
    searchAddonRef,
    scrollToBottom,
    copySelection,
    startClaude,
  };
}
