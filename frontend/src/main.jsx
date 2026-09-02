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

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          theme="colored"
        />
        <ThrottleManager />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
