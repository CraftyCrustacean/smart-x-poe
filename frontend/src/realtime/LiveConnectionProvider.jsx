import { useEffect, useMemo, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { LiveContext } from "./liveContext";

const API_BASE = "http://localhost:8080";
const RECENT_ALERT_LIMIT = 50;

export function LiveConnectionProvider({ children }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("connecting");
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    let hasConnected = false;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/telemetry`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("BatchClosed", (summary) => {
      queryClient.setQueryData(["dashboardSummary"], summary);
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    });

    connection.on("AlertRaised", (alert) => {
      setRecentAlerts((old) => [alert, ...old].slice(0, RECENT_ALERT_LIMIT));
    });

    const start = async () => {
      while (!cancelled) {
        try {
          setStatus("connecting");
          await connection.start();
          if (cancelled) return;
          setStatus("connected");
          if (hasConnected) queryClient.invalidateQueries();
          hasConnected = true;
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    };

    connection.onreconnecting(() => !cancelled && setStatus("reconnecting"));
    connection.onreconnected(() => {
      if (cancelled) return;
      setStatus("connected");
      queryClient.invalidateQueries();
    });
    connection.onclose(() => {
      if (cancelled) return;
      setStatus("disconnected");
      start();
    });

    start();

    return () => {
      cancelled = true;
      connection.stop();
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({ status, recentAlerts }),
    [status, recentAlerts],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
