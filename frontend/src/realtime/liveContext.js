import { createContext, useContext } from "react";

export const LiveContext = createContext({ status: "disconnected", recentAlerts: [] });
export const useLive = () => useContext(LiveContext);
