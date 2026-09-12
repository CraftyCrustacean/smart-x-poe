using backend.Models.Files;
using backend.Services;

namespace backend.Endpoints;

public static class FileEndpoints
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".csv", ".json", ".txt", ".log", ".pdf", ".png", ".jpg", ".jpeg"
    };

    public static void MapFileEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/devices");

        // POST /api/devices/{deviceId}/files
        group.MapPost("/{deviceId}/files", async (
            string deviceId,
            IFormFile file,
            DeviceStore store,
            FileStore fileStore) =>
        {
            if (file == null || file.Length == 0)
            {
                return Results.BadRequest(new { message = "No file provided or file is empty." });
            }

            if (!await store.DeviceExists(deviceId))
            {
                return Results.NotFound(new { message = $"Device with id {deviceId} does not exist." });
            }

            if (file.Length > 5 * 1024 * 1024)
                return Results.BadRequest(new { message = "File size exceeds 5 MB limit." });

            var extension = Path.GetExtension(file.FileName);

            if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
            {
                return Results.BadRequest(new
                {
                    message = $"File type {extension} is not allowed. Allowed formats: {string.Join(", ", AllowedExtensions)}"
                });
            }

            var fileId = Guid.NewGuid();
            var storedFileName = $"{fileId}{extension}";
            var basePath = "/app/uploads";
            var targetDirectory = Path.Combine(basePath, deviceId);
            var storedPath = Path.Combine(targetDirectory, storedFileName);

            Directory.CreateDirectory(targetDirectory);

            await using (var stream = File.Create(storedPath))
            {
                await file.CopyToAsync(stream);
            }

            try
            {
                var deviceFile = new DeviceFile
                {
                    FileId = fileId,
                    DeviceId = deviceId,
                    OriginalFilename = file.FileName,
                    StoredPath = storedPath,
                    ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
                    UploadedAt = DateTime.UtcNow
                };

                await fileStore.SaveFileDataAsync(deviceFile);

                return Results.Created($"/api/devices/{deviceId}/files/{fileId}", deviceFile);
            }
            catch
            {
                if (File.Exists(storedPath))
                {
                    File.Delete(storedPath);
                }
                throw;
            }
        }).DisableAntiforgery();

        // GET /api/devices/{deviceId}/files
        group.MapGet("/{deviceId}/files", async (
            string deviceId,
            DeviceStore store,
            FileStore fileStore) =>
        {
            if (!await store.DeviceExists(deviceId))
            {
                return Results.NotFound(new { message = $"Device with id {deviceId} does not exist." });
            }

            var files = await fileStore.GetFilesByDeviceIdAsync(deviceId);
            return Results.Ok(files);
        });
    }

}

