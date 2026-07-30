import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom';
import { router } from "@/app/router/router";
import './index.css'
import { AuthProvider } from "@/features/auth/providers/AuthProvider";
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="colored"
      />
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);