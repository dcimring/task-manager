import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { GoogleAuthProvider, useGoogleConvexAuth } from './auth.jsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useGoogleConvexAuth}>
        <App />
      </ConvexProviderWithAuth>
    </GoogleAuthProvider>
  </React.StrictMode>
);
