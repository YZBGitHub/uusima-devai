import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import HardwareAgent from './pages/HardwareAgent';
import AgentDetail from './pages/AgentDetail';
import Console from './pages/Console';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="agents" element={<HardwareAgent />} />
          <Route path="agents/:id" element={<AgentDetail />} />
          <Route path="hardware-agent" element={<Navigate to="/agents" replace />} />
          <Route path="console" element={<Console />} />
          <Route path="ai-lab" element={<Navigate to="/console" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
