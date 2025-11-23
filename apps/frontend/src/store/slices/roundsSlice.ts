import { createSlice } from '@reduxjs/toolkit';
import type { Round, RoundDetails } from '../../types';

interface RoundsState {
  rounds: Round[];
  currentRound: RoundDetails | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: RoundsState = {
  rounds: [],
  currentRound: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

const roundsSlice = createSlice({
  name: 'rounds',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setRounds: (state, action) => {
      if (action.payload && Array.isArray(action.payload.data)) {
        state.rounds = action.payload.data;
      } else if (Array.isArray(action.payload)) {
        state.rounds = action.payload;
      } else {
        state.rounds = [];
      }
      state.error = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
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
  setPagination,
} = roundsSlice.actions;

export default roundsSlice.reducer;
