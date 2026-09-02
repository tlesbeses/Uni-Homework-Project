import { QueryClient } from "@tanstack/react-query";

// Configuración global de TanStack Query.
// - staleTime: 30s evita refetch inmediato en cada montaje/remontaje sin que
//   los datos queden obsoletos; la invalidación explícita tras mutaciones
//   mantiene las vistas frescas.
// - retry: 1 solo reintento (el interceptor de axios ya reintenta 429 y 401).
//   Evitamos que TanStack dispare reintentos adicionales en cascada.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
