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

}

