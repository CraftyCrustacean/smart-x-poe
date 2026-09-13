import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function DeviceRegistration() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    device_id: "",
    mac_address: "",
    category: "",
    product_type: "",
    firmware_version: "",
    zone: "",
    latitude: "",
    longitude: "",
    chainage_km: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMacChange = (e) => {
    const raw = e.target.value
      .replace(/[^0-9a-fA-F]/g, "")
      .toUpperCase()
      .slice(0, 12);
    const formatted = raw.match(/.{1,2}/g)?.join(":") || raw;
    setFormData((prev) => ({ ...prev, mac_address: formatted }));
  };

  const makeDeviceId = formData.mac_address
    ? `ESP32-${formData.mac_address.replace(/:/g, "")}`
    : "";

  const zone_labels = {
    richards_bay_durban: "Richards Bay - Durban",
    sasolburg_durban: "Sasolburg - Durban",
    durban_johannesburg_a: "Durban - Johannesburg (Line A)",
    durban_johannesburg_b: "Durban - Johannesburg (Line B)",
  };
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        device_id: makeDeviceId,
        mac_address: data.mac_address,
        category: data.category,
        product_type: data.product_type,
        firmware_version: data.firmware_version,
        location: {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          chainage_km: parseFloat(data.chainage_km),
        },
        topology: {
          region: "South Africa",
          zone: data.zone,
        },
      };

      const res = await fetch("http://localhost:8080/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.message || "Registration failed");
      }

      return res.json();
    },
    onSuccess: (createdDevice) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device registered successfully.");
      navigate(`/devices/${createdDevice.device_id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Register Device</h1>
      <p className="text-slate-500 mb-6">Add a new device to the network</p>
      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            registerMutation.mutate(formData);
          }}
          className="space-y-6"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
              General Information
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  MAC Address
                </label>
                <input
                  type="text"
                  name="mac_address"
                  value={formData.mac_address}
                  onChange={handleMacChange}
                  placeholder="00:00:00:00:00:00"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Device ID
                </label>
                <input
                  type="text"
                  name="device_id"
                  value={makeDeviceId}
                  readOnly
                  placeholder="Generated from MAC address"
                  className="px-3 py-2 rounded-md text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white focus:outline-none focus:border-orange-400"
                >
                  <option value="">Select category...</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Actuator">Actuator</option>
                  <option value="FlowRate">FlowRate</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Product Type
                </label>
                <input
                  type="text"
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleChange}
                  placeholder="e.g. Gas"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Firmware Version
                </label>
                <input
                  type="text"
                  name="firmware_version"
                  value={formData.firmware_version}
                  onChange={handleChange}
                  placeholder="1.0.0"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Zone
                </label>
                <select
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 bg-white focus:outline-none focus:border-orange-400"
                >
                  <option value="">Select zone...</option>
                  {Object.entries(zone_labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 pb-2 border-b border-slate-200">
              Location
            </h3>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="-29.8587"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  min="-180"
                  max="180"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="31.0218"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">
                  Chainage (km)
                </label>
                <input
                  type="number"
                  step="any"
                  name="chainage_km"
                  value={formData.chainage_km}
                  onChange={handleChange}
                  placeholder="12.5"
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-md bg-white border border-orange-300 text-sm font-medium text-slate-700 hover:bg-orange-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-orange-300 text-sm font-medium text-slate-900 hover:bg-orange-400 transition-colors"
            >
              Register Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeviceRegistration;
