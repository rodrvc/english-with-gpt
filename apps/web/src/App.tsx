import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { WritingPage } from './pages/WritingPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/writing" replace />} />
        <Route path="/writing" element={<WritingPage />} />
        <Route path="/speaking" element={<ComingSoonPage />} />
        <Route path="/listening" element={<ComingSoonPage />} />
        <Route path="/reading" element={<ComingSoonPage />} />
        <Route path="*" element={<Navigate to="/writing" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
