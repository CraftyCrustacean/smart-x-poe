import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function DeviceDetails() {
  const navigate = useNavigate();
  const { deviceId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["devices"],
    queryFn: () =>
      fetch("http://localhost:8080/api/devices").then((res) => res.json()),
  });

  const {
    data: files,
    isLoading: filesLoading,
    error: filesError,
  } = useQuery({
    queryKey: ["files", deviceId],
    queryFn: () =>
      fetch(`http://localhost:8080/api/devices/${deviceId}/files`).then((res) =>
        res.json(),
      ),
  });

  const device = data?.find((d) => d.device_id === deviceId);

  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `http://localhost:8080/api/devices/${deviceId}/files`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.message || "Upload failed");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", deviceId] });
      toast.success("File uploaded successfully.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;
  if (!device) return <p>Device not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Device Information</h1>
      <p className="text-slate-500 mb-6">
        View information, attach files, and edit device information
      </p>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {device.device_id}
          </h2>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) uploadMutation.mutate(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="px-3 py-1.5 rounded-md border border-orange-200 bg-white text-sm text-slate-600 hover:bg-orange-100 transition-colors"
            >
              Attach Files
            </button>
            <button
              onClick={() => toast("Feature coming maybe.")}
              className="px-3 py-1.5 rounded-md border: border-1 border-orange-200 bg-white text-sm text-slate-600 hover:bg-orange-100 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
            Details
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
            <div className="flex">
              <span className="w-40 text-slate-500">MAC Address</span>
              <span className="text-slate-900">{device.mac_address}</span>
            </div>
            <div className="flex">
              <span className="w-40 text-slate-500">Type</span>
              <span className="text-slate-900">{device.category}</span>
            </div>
            <div className="flex">
              <span className="w-40 text-slate-500">Status</span>
              <span className="text-slate-900">{device.status}</span>
            </div>
            <div className="flex">
              <span className="w-40 text-slate-500">Firmware Version</span>
              <span className="text-slate-900">{device.firmware_version}</span>
            </div>
            <div className="flex">
              <span className="w-40 text-slate-500">Pipe Product</span>
              <span className="text-slate-900">{device.product_type}</span>
            </div>
            <div className="flex">
              <span className="w-40 text-slate-500">Installment Date</span>
              <span className="text-slate-900">
                {new Date(device.provisioned_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
              Location
            </h3>
            <div className="space-y-2 mb-6">
              <div className="flex">
                <span className="w-40 text-slate-500">Latitude</span>
                <span className="text-slate-900">
                  {device.location.latitude}
                </span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500">Longitude</span>
                <span className="text-slate-900">
                  {device.location.longitude}
                </span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500">Chainage</span>
                <span className="text-slate-900">
                  {device.location.chainage_km} km
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
              Topology
            </h3>
            <div className="space-y-2 mb-6">
              <div className="flex">
                <span className="w-40 text-slate-500">Region</span>
                <span className="text-slate-900">{device.topology.region}</span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500">Zone</span>
                <span className="text-slate-900">{device.topology.zone}</span>
              </div>
              <div className="flex">
                <span className="w-40 text-slate-500">Subzone</span>
                <span className="text-slate-900">
                  {device.topology.subzone}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
            Attached Files
          </h3>

          {filesLoading && (
            <p className="text-slate-500 text-sm">Loading files...</p>
          )}
          {filesError && (
            <p className="text-red-600 text-sm">
              Something went wrong loading files.
            </p>
          )}

          {!filesLoading && !filesError && (!files || files.length === 0) && (
            <p className="text-slate-400 text-sm italic">
              No files attached to this device.
            </p>
          )}

          {!filesLoading && !filesError && files && files.length > 0 && (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.fileId}>
                  <a
                    href={`http://localhost:8080/api/devices/${deviceId}/files/${file.fileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-orange-700 hover:underline text-sm"
                  >
                    {file.originalFilename}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-md bg-orange-400 text-sm text-slate-900 hover:bg-orange-500 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeviceDetails;
