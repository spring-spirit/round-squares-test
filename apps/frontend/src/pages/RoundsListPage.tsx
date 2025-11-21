import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  AppBar,
  Toolbar,
  CircularProgress,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setRounds, setLoading } from '../store/slices/roundsSlice';
import { api } from '../services/api';

export default function RoundsListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { rounds, isLoading } = useAppSelector((state) => state.rounds);

  const isAdmin = user?.role === 'admin';
  const username = user?.username || 'Player';

  useEffect(() => {
    const fetchRounds = async () => {
      dispatch(setLoading(true));
      try {
        const data = await api.getRounds();
        dispatch(setRounds(data));
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchRounds();
  }, [dispatch]);

  const handleCreateRound = async () => {
    try {
      const round = await api.createRound();
      navigate(`/rounds/${round.id}`);
    } catch (error) {
      console.error('Failed to create round:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusText = (round: (typeof rounds)[0]) => {
    const now = new Date();
    const start = new Date(round.startDate);
    const end = new Date(round.endDate);

    if (now < start) return 'Cooldown';
    if (now >= start && now < end) return 'Active';
    return 'Finished';
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Rounds list
          </Typography>
          <Typography variant="body1">{username}</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {isAdmin && (
          <Box sx={{ mb: 3 }}>
            <Button variant="contained" onClick={handleCreateRound}>
              Create round
            </Button>
          </Box>
        )}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {rounds.map((round) => (
              <Card
                key={round.id}
                component={Link}
                to={`/rounds/${round.id}`}
                sx={{ textDecoration: 'none' }}
              >
                <CardContent>
                  <Typography variant="h6">Round ID: {round.id}</Typography>
                  <Typography variant="body2">
                    Start: {formatDate(round.startDate)}
                  </Typography>
                  <Typography variant="body2">
                    End: {formatDate(round.endDate)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Status: {getStatusText(round)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
