import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';

/** Les erreurs d'autorisation ou d'absence ne se corrigent pas en réessayant. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, error) => !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && count < 2,
    },
  },
});
