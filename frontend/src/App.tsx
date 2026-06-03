import React from 'react';
import './App.css';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#1e1e2e', color: '#cdd6f4', minHeight: '100vh' }}>
      <h1>A11y Agent Dashboard</h1>
      <p>This is the placeholder frontend. The backend is fully scaffolded and ready to receive GitLab webhooks!</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#313244', borderRadius: '8px' }}>
        <h3>Next Steps for the Frontend Team:</h3>
        <ul>
          <li>Connect to the backend WebSocket/SSE for real-time logs</li>
          <li>Build the Agent "Thought" Visualizer</li>
          <li>Implement the Before/After Code Diff view</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
