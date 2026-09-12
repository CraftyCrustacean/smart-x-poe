import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";

function DeviceList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedZone = searchParams.get("zone");
  const selectedSubzone = searchParams.get("subzone");

  const zone_labels = {
    richards_bay_durban: "Richards Bay - Durban",
    sasolburg_durban: "Sasolburg - Durban",
    durban_johannesburg_a: "Durban - Johannesburg (Line A)",
    durban_johannesburg_b: "Durban - Johannesburg (Line B)",
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["devices"],
    queryFn: () =>
      fetch("http://localhost:8080/api/devices").then((res) => res.json()),
  });

  const { data: recentBatches } = useQuery({
    queryKey: ["recentBatches"],
    queryFn: () =>
      fetch("http://localhost:8080/api/telemetry/recent").then((res) =>
        res.json(),
      ),
  });

  const onlineDeviceIds = useMemo(() => {
    if (!recentBatches || recentBatches.length === 0) return new Set();

    const latestBatch = recentBatches.reduce((max, current) => {
      const currentTimestamp = new Date(
        current.timestamp || current.item1,
      ).getTime();
      const maxTimestamp = new Date(max.timestamp || max.item1).getTime();
      return currentTimestamp > maxTimestamp ? current : max;
    });

    const packets = latestBatch.packets || latestBatch.item2 || [];
    const deviceIds = packets.map(
      (packet) => packet.deviceId || packet.device_id,
    );

    return new Set(deviceIds);
  }, [recentBatches]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  const zones = [...new Set(data.map((d) => d.topology?.zone).filter(Boolean))];

  const zoneCounts = zones.map((zone) => {
    const subzonesInZone = new Set(
      data
        .filter((d) => d.topology?.zone === zone)
        .map((d) => d.topology?.subzone)
        .filter(Boolean),
    );

    return { zone, subzoneCount: subzonesInZone.size };
  });

  const zoneDevices = data.filter((d) => d.topology?.zone === selectedZone);
  const subzones = [
    ...new Set(zoneDevices.map((d) => d.topology?.subzone).filter(Boolean)),
  ];

  const subzoneCounts = subzones.map((subzone) => {
    const devicesInSubzone = new Set(
      zoneDevices
        .filter((d) => d.topology?.subzone === subzone)
        .map((d) => d.device_id)
        .filter(Boolean),
    );

    return { subzone, deviceCount: devicesInSubzone.size };
  });

  const registerButton = (
    <Link
      to="/devices/new"
      className="px-3 py-1.5 rounded-md bg-white border: border-1 border-orange-300 text-sm text-slate-900 hover:bg-orange-100 transition-colors"
    >
      Register Device
    </Link>
  );

  let content;

  if (!selectedZone) {
    content = (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Select a Zone
          </h2>
          {registerButton}
        </div>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
          {zoneCounts.map(({ zone, subzoneCount }) => (
            <button
              key={zone}
              onClick={() => setSearchParams({ zone })}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors text-left"
            >
              <span className="font-medium text-slate-900">
                {zone_labels[zone] || zone}
              </span>
              <span className="text-sm text-slate-500">
                {subzoneCount} Subzones
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else if (!selectedSubzone) {
    content = (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Select a Subzone in {zone_labels[selectedZone] || selectedZone}
          </h2>
          <div className="flex gap-2">
            {registerButton}
            <button
              onClick={() => setSearchParams({})}
              className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
          {subzoneCounts.map(({ subzone, deviceCount }) => (
            <button
              key={subzone}
              onClick={() => setSearchParams({ zone: selectedZone, subzone })}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors text-left"
            >
              <span className="font-medium text-slate-900">{subzone}</span>
              <span className="text-sm text-slate-500">
                {deviceCount} Devices
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    const filteredDevices = data.filter(
      (d) =>
        d.topology?.zone === selectedZone &&
        d.topology?.subzone === selectedSubzone,
    );

    content = (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Devices in {zone_labels[selectedZone] || selectedZone} &gt;{" "}
            {selectedSubzone}
          </h2>
          <div className="flex gap-2">
            {registerButton}
            <button
              onClick={() => setSearchParams({ zone: selectedZone })}
              className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 px-4 py-2 bg-orange-100 text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200">
            <span></span>
            <span>Device ID</span>
            <span>Chainage</span>
            <span>Category</span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredDevices.map((device) => {
              const isOnline = onlineDeviceIds.has(device.device_id);
              return (
                <Link
                  key={device.device_id}
                  to={`/devices/${device.device_id}`}
                  className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center px-4 py-3 hover:bg-orange-50 transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full inline-block"
                    style={{
                      backgroundColor: isOnline ? "#22c55e" : "#e44040",
                    }}
                    title={isOnline ? "Active in latest telemetry" : "Offline"}
                  />
                  <span className="text-slate-900">{device.device_id}</span>
                  <span className="text-slate-500">
                    {device.location?.chainage_km} km
                  </span>
                  <span className="text-slate-500">{device.category}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Device Details</h1>
      <p className="text-slate-500 mb-6">View and register devices</p>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        {content}
      </div>
    </div>
  );
}

export default DeviceList;
