import { logout } from '../store/slices/authSlice';
import { store } from '../store';

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    const apiError = error as Error & { status?: number };

    if (apiError.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
      return 'Session expired. Please login again.';
    }

    return error.message;
  }
  return 'An unknown error occurred';
};
