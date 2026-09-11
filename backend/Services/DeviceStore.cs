using backend.Models.Provision;
using backend.Models.Telemetry;
using Npgsql;
using static backend.Models.Provision.ProvisionData;

namespace backend.Services;

public class DeviceStore
{
    private readonly NpgsqlDataSource _dataSource;

    public DeviceStore(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task UpsertDevice(ProvisionData data)
    {
        const string sql = @"
            INSERT INTO devices (device_id, mac_address, category, product_type, firmware_version, provisioned_at, status, lat, lon, region, zone, subzone, chainage_km)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (device_id)
            DO UPDATE SET
                firmware_version = EXCLUDED.firmware_version,
                provisioned_at = EXCLUDED.provisioned_at,
                status = EXCLUDED.status;";

        await using var command = _dataSource.CreateCommand(sql);

        command.Parameters.AddWithValue(data.DeviceId);
        command.Parameters.AddWithValue(data.MacAddress);
        command.Parameters.AddWithValue(data.Category.ToString());
        command.Parameters.AddWithValue(data.ProductType);
        command.Parameters.AddWithValue(data.FirmwareVersion);
        command.Parameters.AddWithValue(data.ProvisionedAt);
        command.Parameters.AddWithValue(data.Status.ToString());
        command.Parameters.AddWithValue(data.LocationData.Latitude);
        command.Parameters.AddWithValue(data.LocationData.Longitude);
        command.Parameters.AddWithValue(data.TopologyData.Region);
        command.Parameters.AddWithValue(data.TopologyData.Zone);
        command.Parameters.AddWithValue(data.TopologyData.Subzone);
        command.Parameters.AddWithValue(data.LocationData.Chainage);

        await command.ExecuteNonQueryAsync();

    }

    public async Task<List<ProvisionData>> GetAllDevices()
    {
        const string sql = @"
        SELECT device_id, mac_address, category, product_type, firmware_version, 
               provisioned_at, status, lat, lon, region, zone, subzone, chainage_km
        FROM devices;";

        await using var command = _dataSource.CreateCommand(sql);
        await using var reader = await command.ExecuteReaderAsync();

        var devices = new List<ProvisionData>();

        while (await reader.ReadAsync())
        {
            var device = new ProvisionData
            {
                DeviceId = reader.GetString(0),
                MacAddress = reader.GetString(1),
                Category = Enum.Parse<DeviceCategory>(reader.GetString(2)),
                ProductType = reader.GetString(3),
                FirmwareVersion = reader.GetString(4),
                ProvisionedAt = reader.GetDateTime(5),
                Status = Enum.Parse<DeviceStatus>(reader.GetString(6)),
                LocationData = new LocationData
                {
                    Latitude = reader.GetFloat(7),
                    Longitude = reader.GetFloat(8),
                    Chainage = reader.GetFloat(12)
                },
                TopologyData = new TopologyData
                {
                    Region = reader.GetString(9),
                    Zone = reader.GetString(10),
                    Subzone = reader.GetString(11)
                }
            };

            devices.Add(device);
        }

        return devices;
    }

    public async Task<bool> DeviceExists(string deviceId)
    {
        const string sql = @"
        SELECT EXISTS (
            SELECT 1 
            FROM devices 
            WHERE device_id = $1
        );";

        await using var command = _dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue(deviceId);

        var result = await command.ExecuteScalarAsync();

        return result is bool exists && exists;
    }
}
