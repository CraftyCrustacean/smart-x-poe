import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { LiveConnectionProvider } from "./realtime/LiveConnectionProvider.jsx";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LiveConnectionProvider>
        <App />
      </LiveConnectionProvider>
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
