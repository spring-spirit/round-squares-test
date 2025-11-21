import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setCurrentRound,
  updateRoundScore,
  setLoading,
} from '../store/slices/roundsSlice';
import { api } from '../services/api';
import Goose from '../components/Goose';

export default function RoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentRound, isLoading } = useAppSelector((state) => state.rounds);

  const [timeLeft, setTimeLeft] = useState('00:00');

  useEffect(() => {
    if (!roundId) return;

    const fetchRound = async () => {
      dispatch(setLoading(true));
      try {
        const data = await api.getRound(roundId);
        dispatch(setCurrentRound(data));
      } catch (error) {
        console.error('Failed to fetch round:', error);
        navigate('/rounds');
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchRound();
  }, [roundId, dispatch, navigate]);

  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(currentRound.startDate);
      const end = new Date(currentRound.endDate);

      let targetDate: Date;
      if (now < start) {
        targetDate = start;
      } else if (now < end) {
        targetDate = end;
      } else {
        setTimeLeft('00:00');
        return;
      }

      const diff = Math.max(0, targetDate.getTime() - now.getTime());
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
          2,
          '0',
        )}`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentRound]);

  const handleTap = useCallback(async () => {
    if (!roundId || !currentRound) return;

    try {
      const response = await api.tap(roundId);
      dispatch(
        updateRoundScore({
          roundId,
          score: response.score,
          taps: response.taps,
        }),
      );
    } catch (error) {
      console.error('Failed to tap:', error);
    }
  }, [roundId, currentRound, dispatch]);

  if (isLoading || !currentRound) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const now = new Date();
  const start = new Date(currentRound.startDate);
  const end = new Date(currentRound.endDate);

  let roundStatus: 'active' | 'cooldown' | 'finished';
  if (now < start) {
    roundStatus = 'cooldown';
  } else if (now >= start && now < end) {
    roundStatus = 'active';
  } else {
    roundStatus = 'finished';
  }

  const canTap = roundStatus === 'active';

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {roundStatus === 'cooldown'
              ? 'Cooldown'
              : roundStatus === 'finished'
              ? 'Round is finished'
              : 'Rounds'}
          </Typography>
          <Typography variant="body1">{user?.username || 'Player'}</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                py: 4,
              }}
            >
              <Goose
                onClick={canTap ? handleTap : undefined}
                disabled={!canTap}
              />

              {roundStatus === 'active' && (
                <>
                  <Typography variant="h6">Round is active!</Typography>
                  <Typography>Time left: {timeLeft}</Typography>
                  <Typography>
                    My score - {currentRound.myScore || 0}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleTap}
                    disabled={!canTap}
                  >
                    TAP!
                  </Button>
                </>
              )}

              {roundStatus === 'cooldown' && (
                <>
                  <Typography variant="h6">Cooldown</Typography>
                  <Typography>
                    Time left to start the round: {timeLeft}
                  </Typography>
                </>
              )}

              {roundStatus === 'finished' && (
                <>
                  <Typography variant="h6">Round is finished</Typography>
                  <Typography>Total: {currentRound.totalScore}</Typography>
                  {currentRound.winner && (
                    <Typography>
                      Winner - {currentRound.winner.username}:{' '}
                      {currentRound.winner.score}
                    </Typography>
                  )}
                  <Typography>My score: {currentRound.myScore || 0}</Typography>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
