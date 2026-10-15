import { useSyncExternalStore } from "react";
import { formatAgo } from "../lib/format";

const listeners = new Set();
let timer;

const tick = () => {
  listeners.forEach((l) => l());
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
};

const subscribe = (listener) => {
  listeners.add(listener);
  if (listeners.size === 1) timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearTimeout(timer);
  };
};

const getSecond = () => Math.floor(Date.now() / 1000);

export default function TimeAgo({ iso }) {
  useSyncExternalStore(subscribe, getSecond);

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en-GB")}>
      {formatAgo(iso)}
    </time>
  );
}
