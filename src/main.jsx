import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { GoogleAuthProvider, useGoogleConvexAuth } from './auth.jsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
// initialAuthTokenReuse: without it, Convex force-refreshes the token right
// after confirming the cached one on login. Google ID tokens can't be
// silently re-minted on demand, so that force refresh logged users out.
const convex = new ConvexReactClient(convexUrl, { initialAuthTokenReuse: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useGoogleConvexAuth}>
        <App />
      </ConvexProviderWithAuth>
    </GoogleAuthProvider>
  </React.StrictMode>
);
