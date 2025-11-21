import type { Round, RoundDetails, TapResponse, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    return request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // Rounds
  async getRounds() {
    return request<Round[]>('/rounds');
  },

  async getRound(roundId: string) {
    return request<RoundDetails>(`/rounds/${roundId}`);
  },

  async createRound() {
    return request<Round>('/rounds', {
      method: 'POST',
    });
  },

  // Tap
  async tap(roundId: string) {
    return request<TapResponse>(`/rounds/${roundId}/tap`, {
      method: 'POST',
    });
  },
};
