import { useEffect, useState, useRef } from 'react';
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
  Pagination,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setRounds,
  setLoading,
  setPagination,
} from '../store/slices/roundsSlice';
import { logout } from '../store/slices/authSlice';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { handleApiError } from '../utils/errorHandler';
import { UserRole, RoundStatus } from '../types/enums';

export default function RoundsListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { rounds, isLoading, pagination } = useAppSelector(
    (state) => state.rounds,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const isAdmin = user?.role === UserRole.ADMIN;
  const username = user?.username || 'Player';

  useEffect(() => {
    let mounted = true;

    const handleRoundCreated = () => {
      if (mounted) {
        socketService.getRounds(currentPageRef.current, limit).then((data) => {
          if (mounted) {
            dispatch(setRounds(data));
            dispatch(
              setPagination({
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }),
            );
          }
        });
      }
    };

    const handleRoundStarted = () => {
      if (mounted) {
        socketService.getRounds(currentPageRef.current, limit).then((data) => {
          if (mounted) {
            dispatch(setRounds(data));
            dispatch(
              setPagination({
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }),
            );
          }
        });
      }
    };

    const handleRoundFinished = () => {
      if (mounted) {
        socketService.getRounds(currentPageRef.current, limit).then((data) => {
          if (mounted) {
            dispatch(setRounds(data));
            dispatch(
              setPagination({
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }),
            );
          }
        });
      }
    };

    const handleRoundsListRefresh = () => {
      if (mounted) {
        socketService.getRounds(currentPageRef.current, limit).then((data) => {
          if (mounted) {
            dispatch(setRounds(data));
            dispatch(
              setPagination({
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
              }),
            );
          }
        });
      }
    };

    const initializeSocket = async () => {
      try {
        dispatch(setLoading(true));

        await socketService.connect();

        socketService.onRoundCreated(handleRoundCreated);
        socketService.onRoundStarted(handleRoundStarted);
        socketService.onRoundFinished(handleRoundFinished);
        socketService.onRoundsListRefresh(handleRoundsListRefresh);

        const response = await socketService.getRounds(
          currentPageRef.current,
          limit,
        );
        if (mounted) {
          dispatch(setRounds(response));
          dispatch(
            setPagination({
              page: response.page,
              limit: response.limit,
              total: response.total,
              totalPages: response.totalPages,
            }),
          );
        }
      } catch (error) {
        const errorMessage = handleApiError(error);
        console.error('Failed to connect socket:', errorMessage);
      } finally {
        if (mounted) {
          dispatch(setLoading(false));
        }
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
      socketService.offRoundCreated(handleRoundCreated);
      socketService.offRoundStarted(handleRoundStarted);
      socketService.offRoundFinished(handleRoundFinished);
      socketService.offRoundsListRefresh(handleRoundsListRefresh);
    };
  }, [dispatch, limit]);

  useEffect(() => {
    if (socketService.isConnected()) {
      dispatch(setLoading(true));
      socketService
        .getRounds(currentPage, limit)
        .then((response) => {
          dispatch(setRounds(response));
          dispatch(
            setPagination({
              page: response.page,
              limit: response.limit,
              total: response.total,
              totalPages: response.totalPages,
            }),
          );
        })
        .catch((error) => {
          console.error('Failed to fetch rounds:', error);
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
    }
  }, [currentPage, limit, dispatch]);

  const handleCreateRound = async () => {
    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }
      const newRound = await socketService.createRound();
      navigate(`/rounds/${newRound.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create round';
      console.error('Failed to create round:', errorMessage);
      alert(errorMessage);
    }
  };

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
    if (round?.status) {
      return round.status === RoundStatus.COOLDOWN
        ? 'Cooldown'
        : round.status === RoundStatus.ACTIVE
        ? 'Active'
        : 'Finished';
    }
    const now = new Date();
    const start = new Date(round.startDate);
    const end = new Date(round.endDate);

    if (now < start) return 'Cooldown';
    if (now >= start && now < end) return 'Active';
    return 'Finished';
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    if (!socketService.isConnected()) {
      await socketService.connect();
    }
    dispatch(setLoading(true));
    try {
      const response = await socketService.getRounds(currentPage, limit);
      dispatch(setRounds(response));
      dispatch(
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        }),
      );
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Failed to refresh rounds:', errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Rounds list
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {username}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          {isAdmin && (
            <Button variant="contained" onClick={handleCreateRound}>
              Create round
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
            {pagination.totalPages > 1 && (
              <Box
                sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}
              >
                <Pagination
                  count={pagination.totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
