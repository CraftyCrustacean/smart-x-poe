namespace backend.Models.Files;

    public class DeviceFile
    {
        public required Guid FileId { get; set; }
        public required string DeviceId { get; set; }
        public required string OriginalFilename { get; set; }
        public required string StoredPath { get; set; }
        public required string ContentType { get; set; }
        public DateTime UploadedAt { get; set; }
    }

