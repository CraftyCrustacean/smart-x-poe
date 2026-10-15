import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { getJson } from "../api/dashboard";
import { useDevices } from "../api/devices";
import SearchResults from "../components/search/SearchResults";
import useSearchParamsState from "../components/search/useSearchParamsState";
import { showsResults } from "../lib/search";

function DeviceList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { update } = useSearchParamsState();
  const selectedZone = searchParams.get("zone");
  const selectedSubzone = searchParams.get("subzone");
  const searching = showsResults(searchParams);

  const zone_labels = {
    richards_bay_durban: "Richards Bay - Durban",
    sasolburg_durban: "Sasolburg - Durban",
    durban_johannesburg_a: "Durban - Johannesburg (Line A)",
    durban_johannesburg_b: "Durban - Johannesburg (Line B)",
  };

  const { data, isLoading, error } = useDevices();

  const { data: recentBatches } = useQuery({
    queryKey: ["recentBatches"],
    queryFn: () => getJson("/api/telemetry/recent"),
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

  const registerButton = (
    <Link
      to="/devices/new"
      className="px-3 py-1.5 rounded-md bg-white border border-orange-300 text-sm text-slate-900 hover:bg-orange-100 transition-colors"
    >
      Register Device
    </Link>
  );

  const page = (content) => (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Device Details</h1>
      <p className="text-slate-500 mb-6">
        Browse by zone, or search and filter from the bar above
      </p>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        {content}
      </div>
    </div>
  );

  if (searching) {
    const browsingSubzone =
      selectedSubzone &&
      [...searchParams.keys()].every((k) => ["zone", "subzone", "sort", "page"].includes(k));

    return page(
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {browsingSubzone
              ? `Devices in ${zone_labels[selectedZone] || selectedZone} > ${selectedSubzone}`
              : "Search results"}
          </h2>
          <div className="flex gap-2">
            {registerButton}
            {browsingSubzone && (
              <button
                onClick={() => setSearchParams({ zone: selectedZone })}
                className="px-3 py-1.5 rounded-md bg-orange-300 text-sm text-slate-900 hover:bg-orange-400 transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
        <SearchResults params={searchParams} update={update} />
      </div>,
    );
  }

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
  } else {
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
  }

  return page(content);
}

export default DeviceList;
