using backend.Models.Files;
using Npgsql;

namespace backend.Services;

public class FileStore
{
    private readonly NpgsqlDataSource _dataSource;

    public FileStore(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task SaveFileDataAsync(DeviceFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        const string sql = @"
        INSERT INTO device_files (file_id, device_id, original_filename, stored_path, content_type, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6);";

        await using var command = _dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue(file.FileId);
        command.Parameters.AddWithValue(file.DeviceId);
        command.Parameters.AddWithValue(file.OriginalFilename);
        command.Parameters.AddWithValue(file.StoredPath);
        command.Parameters.AddWithValue(file.ContentType);
        command.Parameters.AddWithValue(file.UploadedAt);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<List<DeviceFileSummary>> GetFilesByDeviceIdAsync(string deviceId)
    {
        ArgumentException.ThrowIfNullOrEmpty(deviceId);

        const string sql = @"
        SELECT file_id, original_filename, content_type, uploaded_at
        FROM device_files
        WHERE device_id = $1
        ORDER BY uploaded_at DESC;";

        await using var command = _dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue(deviceId);

        await using var reader = await command.ExecuteReaderAsync();

        var files = new List<DeviceFileSummary>();

        while (await reader.ReadAsync())
        {
            files.Add(new DeviceFileSummary
            {
                FileId = reader.GetGuid(0),
                OriginalFilename = reader.GetString(1),
                ContentType = reader.GetString(2),
                UploadedAt = reader.GetDateTime(3)
            });
        }

        return files;
    }

    public async Task<DeviceFile?> GetFileByIdAsync(Guid fileId)
    {
        const string sql = @"
        SELECT file_id, device_id, original_filename, stored_path, content_type, uploaded_at
        FROM device_files
        WHERE file_id = $1;";

        await using var command = _dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue(fileId);

        await using var reader = await command.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new DeviceFile
            {
                FileId = reader.GetGuid(0),
                DeviceId = reader.GetString(1),
                OriginalFilename = reader.GetString(2),
                StoredPath = reader.GetString(3),
                ContentType = reader.GetString(4),
                UploadedAt = reader.GetDateTime(5)
            };
        }

        return null;
    }

}
