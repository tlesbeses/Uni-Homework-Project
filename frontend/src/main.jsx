import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from "@/app/router/router";
import './index.css'
import { AuthProvider } from "@/features/auth/providers/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { ThrottleManager } from "@/shared/components/ThrottleManager";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import {
    installGlobalErrorListeners,
    reportErrorFromEvent,
} from "@/shared/utils/reportError";

installGlobalErrorListeners();

createRoot(document.getElementById('root'), {
    // Errores que ningún boundary pudo capturar (p. ej. el propio errorElement
    // de una ruta): que no queden sin registrar.
    onUncaughtError: (error) => {
        reportErrorFromEvent(error);
    },
}).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          theme="colored"
        />
        <ThrottleManager />
        <ErrorBoundary name="App">
          <RouterProvider router={router} />
        </ErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
