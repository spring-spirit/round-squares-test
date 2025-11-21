import { createSlice } from '@reduxjs/toolkit';
import type { Round, RoundDetails } from '../../types';

interface RoundsState {
  rounds: Round[];
  currentRound: RoundDetails | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RoundsState = {
  rounds: [],
  currentRound: null,
  isLoading: false,
  error: null,
};

const roundsSlice = createSlice({
  name: 'rounds',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setRounds: (state, action) => {
      state.rounds = action.payload;
      state.error = null;
    },
    setCurrentRound: (state, action) => {
      state.currentRound = action.payload;
      state.error = null;
    },
    updateRoundScore: (state, action) => {
      const { roundId, score, taps } = action.payload;
      if (state.currentRound && state.currentRound.id === roundId) {
        state.currentRound.myScore = score;
        if (taps !== undefined) {
          state.currentRound.myTaps = taps;
        }
      }
      const round = state.rounds.find((r) => r.id === roundId);
      if (round) {
        round.myScore = score;
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setLoading,
  setRounds,
  setCurrentRound,
  updateRoundScore,
  setError,
} = roundsSlice.actions;

export default roundsSlice.reducer;
