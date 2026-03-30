import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
/* Responsive Core System Imports */
import "./styles/system/breakpoints.css";
import "./styles/system/spacing-system.css";
import "./styles/system/overflow-guard.css";
import "./styles/system/container-system.css";
import "./styles/system/layout-system.css";

import "./styles/typography.css";
import "./styles/global.css";
import "./styles/animations.css";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
