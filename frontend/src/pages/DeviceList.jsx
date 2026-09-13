import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Funnel } from "lucide-react";

function DeviceList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedZone = searchParams.get("zone");
  const selectedSubzone = searchParams.get("subzone");
  const filterPanelRef = useRef(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef(null);

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

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chainageMin, setChainageMin] = useState("");
  const [chainageMax, setChainageMax] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedButton = filterButtonRef.current?.contains(event.target);
      const clickedPanel = filterPanelRef.current?.contains(event.target);

      if (!clickedButton && !clickedPanel) {
        if (filtersOpen) {
          event.preventDefault();
        }
        setFiltersOpen(false);
      }

      if (!clickedButton && !clickedPanel) {
        setFiltersOpen(false);
      }
    };

    if (filtersOpen) {
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [filtersOpen]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  const zones = [...new Set(data.map((d) => d.topology?.zone).filter(Boolean))];

  const zoneCounts = zones.map((zone) => {
    const devicesInZone = data.filter((d) => d.topology?.zone === zone);
    const subzoneGroups = [
      ...new Set(devicesInZone.map((d) => d.topology?.subzone).filter(Boolean)),
    ];

    const subzonesWithIssues = subzoneGroups.filter((subzone) =>
      devicesInZone
        .filter((d) => d.topology?.subzone === subzone)
        .some((d) => !onlineDeviceIds.has(d.device_id)),
    ).length;

    return { zone, subzoneCount: subzoneGroups.length, subzonesWithIssues };
  });

  const zoneDevices = data.filter((d) => d.topology?.zone === selectedZone);
  const subzones = [
    ...new Set(zoneDevices.map((d) => d.topology?.subzone).filter(Boolean)),
  ];

  const subzoneCounts = subzones.map((subzone) => {
    const devicesInSubzone = zoneDevices.filter(
      (d) => d.topology?.subzone === subzone,
    );
    const disconnectedCount = devicesInSubzone.filter(
      (d) => !onlineDeviceIds.has(d.device_id),
    ).length;
    return { subzone, deviceCount: devicesInSubzone.length, disconnectedCount };
  });

  const registerButton = (
    <Link
      to="/devices/new"
      className="px-3 py-1.5 rounded-md bg-white border border-orange-300 text-sm text-slate-900 hover:bg-orange-100 transition-colors"
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
          {zoneCounts.map(({ zone, subzoneCount, subzonesWithIssues }) => (
            <button
              key={zone}
              onClick={() => setSearchParams({ zone })}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors text-left"
            >
              <span className="font-medium text-slate-900">
                {zone_labels[zone] || zone}
              </span>
              <span className="text-sm text-slate-500">
                {subzonesWithIssues > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    {subzonesWithIssues} issues
                  </span>
                )}
                {" • "}
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
          {subzoneCounts.map(({ subzone, deviceCount, disconnectedCount }) => (
            <button
              key={subzone}
              onClick={() => setSearchParams({ zone: selectedZone, subzone })}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors text-left"
            >
              <span className="font-medium text-slate-900">{subzone}</span>
              <span className="text-sm text-slate-500">
                {disconnectedCount > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    {disconnectedCount} Error
                  </span>
                )}
                {" • "}
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

    const finalDevices = filteredDevices.filter((device) => {
      const matchesCategory =
        categoryFilter === "all" || device.category === categoryFilter;

      const isOnline = onlineDeviceIds.has(device.device_id);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && isOnline) ||
        (statusFilter === "offline" && !isOnline);

      const chainage = device.location?.chainage_km;
      const matchesMin =
        chainageMin === "" || chainage >= parseFloat(chainageMin);
      const matchesMax =
        chainageMax === "" || chainage <= parseFloat(chainageMax);

      return matchesCategory && matchesStatus && matchesMin && matchesMax;
    });

    content = (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Devices in {zone_labels[selectedZone] || selectedZone} &gt;{" "}
            {selectedSubzone}
          </h2>
          <div className="flex items-start gap-2">
            <div className="relative">
              <button
                ref={filterButtonRef}
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="p-2 rounded-md border border-transparent bg-white text-slate-900 hover: hover:text-orange-600 transition-colors"
                aria-label="Filters"
              >
                <Funnel size={18} strokeWidth={1} />
              </button>
              {filtersOpen && (
                <div
                  ref={filterPanelRef}
                  className="absolute z-10 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg p-4 flex flex-col gap-3 w-72"
                >
                  <label className="text-xs font-medium text-slate-500">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Actuator">Actuator</option>
                    <option value="FlowRate">FlowRate</option>
                  </select>
                  <label className="text-xs font-medium text-slate-500">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">
                      Chainage Range (km)
                    </label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={chainageMin}
                      onChange={(e) => setChainageMin(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-md text-sm w-full"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={chainageMax}
                      onChange={(e) => setChainageMax(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-md text-sm w-full"
                    />
                    <button
                      onClick={() => {
                        setCategoryFilter("all");
                        setStatusFilter("all");
                        setChainageMin("");
                        setChainageMax("");
                      }}
                      className="px-3 py-1.5 rounded-md bg-white border: border-1 border-orange-300 text-sm text-slate-900 hover:bg-orange-100 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
            {registerButton}
            <button
              onClick={() => setSearchParams({ zone: selectedZone })}
              className="px-3 py-1.5 rounded-md boreder: border-1 border-transparent bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
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
            {finalDevices.map((device) => {
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
