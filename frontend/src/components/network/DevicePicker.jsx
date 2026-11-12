import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logSearchClick } from "../../api/search";
import DeviceSuggestInput from "../search/DeviceSuggestInput";

export default function DevicePicker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const inputId = useId();

  const openDevice = (deviceId) => {
    logSearchClick(deviceId, { q: [text.trim()] });
    navigate(`/network/devices/${encodeURIComponent(deviceId)}`);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const top = queryClient.getQueryData(["suggest", text])?.[0]?.deviceId;
    if (top) openDevice(top);
    else if (text.trim())
      navigate(`/network/devices/${encodeURIComponent(text.trim())}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <label
        htmlFor={inputId}
        className="shrink-0 text-sm font-medium text-slate-700"
      >
        Find a device
      </label>
      <DeviceSuggestInput
        id={inputId}
        value={text}
        onChange={setText}
        onSelect={openDevice}
        className="min-w-0 flex-1"
      />
      <button
        type="submit"
        className="shrink-0 px-3 py-1 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
      >
        Open
      </button>
    </form>
  );
}
