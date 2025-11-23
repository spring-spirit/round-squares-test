import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { setUser, logout } from './store/slices/authSlice';
import { api } from './services/api';
import { socketService } from './services/socket';
import LoginPage from './pages/LoginPage';
import RoundsListPage from './pages/RoundsListPage';
import RoundPage from './pages/RoundPage';

function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        dispatch(setUser(user));
        if (user) {
          try {
            await socketService.connect();
          } catch (error) {
            console.error('Failed to connect socket:', error);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        dispatch(logout());
      }
    };

    checkAuth();

    return () => {
      socketService.disconnect();
    };
  }, [dispatch]);

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
