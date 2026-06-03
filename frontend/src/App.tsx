import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:3000');

function App() {
  const [logs, setLogs] = useState<string[]>(['AccessOps Terminal Initialized...', 'Waiting for Webhook events...']);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('agent:log', (message: string) => {
      setLogs((prev) => [...prev, message]);
    });

    return () => {
      socket.off('agent:log');
    };
  }, []);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="dashboard">
      <div className="header">
        <h1>AccessOps</h1>
        <p>Autonomous Accessibility Agent Dashboard</p>
      </div>

      <div className="terminal-container">
        <div className="terminal-header">
          <div className="mac-buttons">
            <div className="mac-btn close"></div>
            <div className="mac-btn min"></div>
            <div className="mac-btn max"></div>
          </div>
          <div className="terminal-title">agent-thought-stream</div>
        </div>
        
        <div className="terminal-body">
          {logs.map((log, index) => {
            // Highlight specific action lines for visual effect
            const isHighlight = log.includes('Gemini called tool') || log.includes('Triggering Agent Workflow');
            return (
              <div key={index} className={`log-entry ${isHighlight ? 'highlight' : ''}`}>
                <span style={{ color: '#818cf8', marginRight: '8px' }}>➜</span> 
                {log}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
          <div className="log-entry">
             <span style={{ color: '#818cf8', marginRight: '8px' }}>➜</span> 
             <span className="cursor"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
