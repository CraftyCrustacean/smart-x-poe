import { useCallback, useEffect, useMemo, useState } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "../lib/format";
import { LiveContext } from "./liveContext";

const RECENT_ALERT_LIMIT = 50;

export function LiveConnectionProvider({ children }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("connecting");
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

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
      queryClient.invalidateQueries({ queryKey: ["device"] });
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    });

    connection.on("AlertRaised", (alert) => {
      setRecentAlerts((old) => [alert, ...old].slice(0, RECENT_ALERT_LIMIT));
      setUnreadAlerts((n) => Math.min(n + 1, RECENT_ALERT_LIMIT));
    });

    connection.on("CommandsChanged", () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      queryClient.invalidateQueries({ queryKey: ["device"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
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

  const markAlertsRead = useCallback(() => setUnreadAlerts(0), []);

  const value = useMemo(
    () => ({ status, recentAlerts, unreadAlerts, markAlertsRead }),
    [status, recentAlerts, unreadAlerts, markAlertsRead],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
