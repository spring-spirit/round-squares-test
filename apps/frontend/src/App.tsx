import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import LoginPage from './pages/LoginPage';
import RoundsListPage from './pages/RoundsListPage';
import RoundPage from './pages/RoundPage';

function App() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/rounds" replace /> : <LoginPage />
          }
        />
        <Route
          path="/rounds"
          element={
            isAuthenticated ? (
              <RoundsListPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/rounds/:roundId"
          element={
            isAuthenticated ? <RoundPage /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/rounds" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
