import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

function DeviceDetails() {
  const { deviceId } = useParams();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: () =>
      fetch('http://localhost:8080/api/devices').then(res => res.json()),
  });

  const {
    data: files,
    isLoading: filesLoading,
    error: filesError,
  } = useQuery({
    queryKey: ['files', deviceId],
    queryFn: () =>
      fetch(`http://localhost:8080/api/devices/${deviceId}/files`)
        .then(res => res.json()),
  });

  const device = data?.find(d => d.device_id === deviceId);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;
  if (!device) return <p>Device not found.</p>;

  return (
    <div>
      <h1>Device Details</h1>

      <section>
        <h2>Device Information</h2>
        <p>
          <strong>Device ID:</strong> {device.device_id}
        </p>
        <p>
          <strong>Device Mac Address:</strong> {device.mac_address}
        </p>
        <p>
          <strong>Device Type:</strong> {device.category}
        </p>
        <p>
          <strong>Status:</strong> {device.status}
        </p>
        <p>
          <strong>Firmware Version:</strong> {device.firmware_version}
        </p>
        <p>
          <strong>Pipe Product:</strong> {device.product_type}
        </p>
        <p>
          <strong>Installment Date:</strong> {' '}
          {new Date(device.provisioned_at).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}
        </p>
      </section>

      <section>
        <h2>Location</h2>
        <p>
          <strong>Latitude:</strong> {device.location?.latitude}
        </p>
        <p>
          <strong>Longitude:</strong> {device.location?.longitude}
        </p>
        <p>
          <strong>Chainage:</strong> {device.location?.chainage_km} km
        </p>
      </section>

      <section>
        <h2>Topology</h2>
        <p>
          <strong>Region:</strong> {device.topology?.region}
        </p>
        <p>
          <strong>Zone:</strong> {device.topology?.zone}
        </p>
        <p>
          <strong>Sub-Zone:</strong> {device.topology?.subzone}
        </p>
      </section>

      <section>
        <h2>Files</h2>

        {filesLoading && <p>Loading files...</p>}

        {filesError && (
          <p>Something went wrong loading files: {filesError.message}</p>
        )}

        {!filesLoading && !filesError && files?.length === 0 && (
          <p>No files uploaded yet.</p>
        )}

        {!filesLoading && !filesError && files?.length > 0 && (
          <ul>
            {files.map(file => (
              <li key={file.fileId}>
                <strong>{file.originalFilename}</strong>
                {' - '}
                {file.contentType}
                {' - '}
                {new Date(file.uploadedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}

        <div>
          <label htmlFor="fileUpload">Upload file:</label>
          <input
            id="fileUpload"
            type="file"
          />
        </div>
      </section>
    </div>
  );
}

export default DeviceDetails;