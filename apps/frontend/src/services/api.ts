import type { User } from '../types';

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
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.message || error.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    const error = new Error(errorMessage);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return response.json();
}

export const api = {
  async login(username: string, password: string) {
    return request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe() {
    return request<User>('/auth/me');
  },

  async logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};
