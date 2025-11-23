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
import { logout } from '../store/slices/authSlice';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { handleApiError } from '../utils/errorHandler';
import AnimatedGuss from '../components/AnimatedGuss';
import type { RoundDetails } from '../types';
import { RoundStatus } from '../types/enums';

export default function RoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentRound, isLoading } = useAppSelector((state) => state.rounds);

  const [timeLeft, setTimeLeft] = useState('00:00');
  const roundStatus =
    currentRound?.status ||
    (() => {
      if (!currentRound) return RoundStatus.COOLDOWN;
      const now = new Date();
      const start = new Date(currentRound?.startDate || '');
      const end = new Date(currentRound?.endDate || '');

      if (now < start) return RoundStatus.COOLDOWN;
      if (now >= start && now < end) return RoundStatus.ACTIVE;
      return RoundStatus.FINISHED;
    })();

  const canTap = roundStatus === RoundStatus.ACTIVE;

  useEffect(() => {
    if (!roundId) return;

    let mounted = true;

    const initializeRound = async () => {
      try {
        dispatch(setLoading(true));

        if (!socketService.isConnected()) {
          await socketService.connect();
        }

        const handleRoundUpdate = (data: RoundDetails) => {
          if (mounted) {
            dispatch(setCurrentRound(data));
          }
        };

        const handleRoundDetails = (data: RoundDetails) => {
          if (mounted) {
            dispatch(setCurrentRound(data));
          }
        };

        const handleRoundStarted = () => {
          if (mounted) {
            socketService.getRound(roundId).then((data) => {
              if (mounted) {
                dispatch(setCurrentRound(data));
              }
            });
          }
        };

        const handleRoundFinished = () => {
          if (mounted) {
            socketService.getRound(roundId).then((data) => {
              if (mounted) {
                dispatch(setCurrentRound(data));
              }
            });
          }
        };

        socketService.subscribeRound(roundId, handleRoundUpdate);
        socketService.onRoundStartedSpecific(roundId, handleRoundStarted);
        socketService.onRoundFinishedSpecific(roundId, handleRoundFinished);

        if (socketService.isConnected()) {
          socketService.socketInstance?.on('round:details', handleRoundDetails);
        }

        const data = await socketService.getRound(roundId);
        if (mounted) {
          dispatch(setCurrentRound(data));
        }

        return () => {
          socketService.unsubscribeRound(roundId);
          socketService.offRoundStartedSpecific(roundId, handleRoundStarted);
          socketService.offRoundFinishedSpecific(roundId, handleRoundFinished);
          if (socketService.socketInstance) {
            socketService.socketInstance.off(
              'round:details',
              handleRoundDetails,
            );
          }
        };
      } catch (error) {
        const errorMessage = handleApiError(error);
        console.error('Failed to fetch round:', errorMessage);
        if (mounted) {
          navigate('/rounds');
        }
      } finally {
        if (mounted) {
          dispatch(setLoading(false));
        }
      }
    };

    initializeRound();

    return () => {
      mounted = false;
      if (roundId) {
        socketService.unsubscribeRound(roundId);
      }
    };
  }, [roundId, dispatch, navigate]);

  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(currentRound.startDate);
      const end = new Date(currentRound.endDate);

      let targetDate: Date;
      let newStatus: RoundStatus;

      if (now < start) {
        targetDate = start;
        newStatus = RoundStatus.COOLDOWN;
      } else if (now < end) {
        targetDate = end;
        newStatus = RoundStatus.ACTIVE;
      } else {
        setTimeLeft('00:00');
        newStatus = RoundStatus.FINISHED;
        if (currentRound.status !== RoundStatus.FINISHED) {
          socketService.getRound(roundId || '').then((data) => {
            dispatch(setCurrentRound(data));
          });
        }
        return;
      }

      if (currentRound.status !== newStatus) {
        socketService.getRound(roundId || '').then((data) => {
          dispatch(setCurrentRound(data));
        });
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
  }, [currentRound, roundId, dispatch]);

  const handleTap = useCallback(async () => {
    if (!roundId || !currentRound || !canTap) return;

    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }

      socketService
        .tap(roundId)
        .then((response) => {
          dispatch(
            updateRoundScore({
              roundId,
              score: response.score,
              taps: response.taps,
            }),
          );
        })
        .catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to tap';
          console.error('Failed to tap:', errorMessage);
        });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to tap';
      console.error('Failed to tap:', errorMessage);
    }
  }, [roundId, currentRound, canTap, dispatch]);

  const handleLogout = async () => {
    try {
      await api.logout();
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to logout:', errorMessage);
      dispatch(logout());
      navigate('/login');
    }
  };

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

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            onClick={() => navigate('/rounds')}
            sx={{ mr: 2 }}
          >
            ← Back to rounds
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {roundStatus === RoundStatus.COOLDOWN
              ? 'Cooldown'
              : roundStatus === RoundStatus.FINISHED
              ? 'Round is finished'
              : 'Round'}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.username || 'Player'}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth="sm"
        sx={{
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          mt: 0,
          py: 2,
        }}
      >
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              flex: 1,
              py: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <AnimatedGuss
                onClick={canTap ? handleTap : undefined}
                disabled={!canTap}
                currentRound={currentRound}
                userRole={user?.role}
              />

              {roundStatus === RoundStatus.ACTIVE && (
                <>
                  <Typography variant="h6">Round is active!</Typography>
                  <Typography>Time left: {timeLeft}</Typography>
                  <Typography>
                    My score - {currentRound.myScore || 0}
                  </Typography>
                </>
              )}

              {roundStatus === RoundStatus.COOLDOWN && (
                <>
                  <Typography variant="h6">Cooldown</Typography>
                  <Typography>
                    Time left to start the round: {timeLeft}
                  </Typography>
                </>
              )}

              {roundStatus === RoundStatus.FINISHED && (
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
