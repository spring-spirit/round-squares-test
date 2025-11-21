import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { increment, decrement, reset } from './store/slices/counterSlice';
import './App.css';

function App() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 3,
        }}
      >
        <Stack direction="row" spacing={2}>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </Stack>

        <Typography variant="h3" component="h1" gutterBottom>
          Vite + React + Redux Toolkit
        </Typography>

        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h4" component="div">
                {count}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => dispatch(decrement())}
                  size="medium"
                >
                  -
                </Button>
                <Button
                  variant="contained"
                  onClick={() => dispatch(increment())}
                  size="medium"
                >
                  +
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => dispatch(reset())}
                  size="medium"
                >
                  Reset
                </Button>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                Edit <code>src/App.tsx</code> and save to test HMR
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary">
          Click on the Vite and React logos to learn more
        </Typography>
      </Box>
    </Container>
  );
}

export default App;
