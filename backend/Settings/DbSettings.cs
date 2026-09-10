namespace backend.Settings;

public class DbSettings
{
    public const string DbSettingsName = "DbSettings";
    public required string DbHost { get; set; }
    public required int DbPort { get; set; }
    public required string DbName { get; set; }
    public required string DbUser { get; set; }
    public required string DbPassword { get; set; }

}

