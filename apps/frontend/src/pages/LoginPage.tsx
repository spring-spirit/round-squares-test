import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Stack,
  Alert,
} from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import {
  setLoading,
  setUser,
  setError as setAuthError,
} from '../store/slices/authSlice';
import { api } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    dispatch(setLoading(true));

    try {
      const response = await api.login(username, password);
      dispatch(setUser(response.user));
      navigate('/rounds');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login error';
      setError(errorMessage);
      dispatch(setAuthError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              LOGIN
            </Typography>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                >
                  LOGIN
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
