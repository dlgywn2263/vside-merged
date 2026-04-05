"use client";

import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Terminal() {
  const containerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const wsRef = useRef(null);

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state) => state.fileSystem,
  );

  const initTerminal = () => {
    if (!containerRef.current) return;
    if (xtermRef.current) return;

    if (
      containerRef.current.clientWidth === 0 ||
      containerRef.current.clientHeight === 0
    ) {
      return;
    }

    try {
      const term = new XTerminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
          background: "#ffffff",
          foreground: "#333333",
          cursor: "#333333",
          selectionBackground: "rgba(0, 0, 0, 0.1)",
          black: "#000000",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#e5e5e5",
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(containerRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.writeln("\x1b[32m$ WebIDE Terminal Ready.\x1b[0m");

      if (workspaceId && activeProject) {
        connectWebSocket(term, workspaceId);
      }
    } catch (e) {
      console.warn("Terminal init deferred:", e);
    }
  };

  const connectWebSocket = (term, wid) => {
    if (wsRef.current) wsRef.current.close();

    if (!activeProject) {
      term.writeln(
        "\r\n\x1b[33m[System] Please select a project first.\x1b[0m",
      );
      return;
    }

    const ws = new WebSocket("ws://localhost:8080/ws/terminal");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "START",
          workspaceId: wid,
          projectName: activeProject,
          branchName: activeBranch,
        }),
      );
    };

    ws.onmessage = (e) => term.write(e.data);

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "INPUT", command: data }));
      }
    });
  };

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!containerRef.current) return;

      if (!xtermRef.current) {
        if (
          entries[0].contentRect.width > 0 &&
          entries[0].contentRect.height > 0
        ) {
          initTerminal();
        }
      } else if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {}
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (wsRef.current) wsRef.current.close();
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    if (xtermRef.current && workspaceId && activeProject) {
      xtermRef.current.writeln(
        `\r\n\x1b[32m[System] Switching terminal to ${activeProject} (${activeBranch})...\x1b[0m\r\n`,
      );
      connectWebSocket(xtermRef.current, workspaceId);
    }
  }, [workspaceId, activeProject, activeBranch]);

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden pl-2 pt-1">
      <div className="flex-1 bg-white relative min-h-[50px]">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
