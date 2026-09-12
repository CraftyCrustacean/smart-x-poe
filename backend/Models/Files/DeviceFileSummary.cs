namespace backend.Models.Files;

    public class DeviceFileSummary
    {
        public required Guid FileId { get; set; }
        public required string OriginalFilename { get; set; }
        public required string ContentType { get; set; }
        public required DateTime UploadedAt { get; set; }
    }

