import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DroneDetail from './pages/DroneDetail';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/drones/:id" element={<DroneDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
