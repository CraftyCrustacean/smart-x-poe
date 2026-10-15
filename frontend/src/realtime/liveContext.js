import { createContext, useContext } from "react";

export const LiveContext = createContext({
  status: "disconnected",
  recentAlerts: [],
  unreadAlerts: 0,
  markAlertsRead: () => {},
});
export const useLive = () => useContext(LiveContext);
