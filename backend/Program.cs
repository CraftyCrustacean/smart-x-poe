using backend.BackgroundServices;
using backend.Endpoints;
using backend.Hubs;
using backend.Services;
using backend.Services.Commands;
using backend.Services.History;
using backend.Services.Persistence;
using backend.Services.Search;
using backend.Services.Snapshots;
using backend.Services.State;
using backend.Services.Telemetry;
using backend.Services.Topology;
using backend.Settings;

var builder = WebApplication.CreateBuilder(args);

var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        name: myAllowSpecificOrigins,
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    );
});

builder.Services.AddHostedService<MqttWorker>();
builder.Services.AddSingleton<DeviceRegistry>();
builder.Services.AddSingleton<TelemetryBatcher>();
builder.Services.AddSingleton<EnvironmentalHistory>();
builder.Services.AddSingleton<FlowRateHistory>();
builder.Services.AddSingleton<TelemetryProcessor>();
builder.Services.AddSingleton<DeviceStore>();
builder.Services.AddSingleton<MqttConnectionStatus>();
builder.Services.AddSingleton<PipelineData>();
builder.Services.AddSingleton<FileStore>();
builder.Services.AddSingleton<FlowRateAggregator>();
builder.Services.Configure<MqttSettings>(
    builder.Configuration.GetSection(MqttSettings.MqttSettingsName)
);
builder.Services.Configure<DbSettings>(builder.Configuration.GetSection(DbSettings.DbSettingsName));
var dbSettings =
    builder.Configuration.GetSection(DbSettings.DbSettingsName).Get<DbSettings>()
    ?? throw new InvalidOperationException("Database settings are not configured.");
builder.Services.AddHealthChecks();
builder.Services.AddSingleton<TelemetryQueue>();
builder.Services.AddHostedService<TelemetryConsumer>();
builder.Services.AddSingleton(typeof(ReadingHistory<>));
builder.Services.AddSingleton<DisconnectedDevices>();
builder.Services.AddSingleton<ActiveAlerts>();
builder.Services.AddSingleton<DisconnectDetector>();
builder.Services.AddHostedService<BatchCloseHandler>();
builder.Services.Configure<ThresholdSettings>(
    builder.Configuration.GetSection(ThresholdSettings.ThresholdSettingsName)
);
builder.Services.AddSingleton<ThresholdEvaluator>();
builder.Services.AddSingleton<SnapshotStore>();
builder.Services.AddSingleton<SnapshotBuilder>();
builder.Services.AddSingleton<DashboardSummaryService>();
builder.Services.AddSignalR();
builder.Services.AddSingleton<LiveUpdates>();
builder.Services.AddSingleton<BatchClock>();
builder.Services.AddSingleton<MutedDevices>();
builder.Services.AddSingleton<AcknowledgedAlerts>();
builder.Services.AddSingleton<CommandService>();
builder.Services.Configure<SearchSettings>(
    builder.Configuration.GetSection(SearchSettings.SearchSettingsName)
);
builder.Services.AddSingleton<DeviceSearchService>();
builder.Services.AddSingleton<SearchClickLog>();

string connectionString = (
    $"Host={dbSettings.DbHost};"
    + $"Port={dbSettings.DbPort};"
    + $"Database={dbSettings.DbName};"
    + $"Username={dbSettings.DbUser};"
    + $"Password={dbSettings.DbPassword}"
);

builder.Services.AddNpgsqlDataSource(connectionString);

var app = builder.Build();

var registry = app.Services.GetRequiredService<DeviceRegistry>();
var deviceStore = app.Services.GetRequiredService<DeviceStore>();

var loaded = 0;
foreach (var device in await deviceStore.GetAllDevices())
{
    if (registry.Register(device))
        loaded++;
}
app.Logger.LogInformation("Device registry loaded {Count} devices from Postgres.", loaded);

app.UseCors(myAllowSpecificOrigins);
app.MapDeviceEndpoints();
app.MapFileEndpoints();
app.MapTopologyEndpoints();
app.MapTelemetryEndpoints();
app.MapDiagnosticsEndpoints();
app.MapSnapshotEndpoints();
app.MapDashboardEndpoints();
app.MapCommandEndpoints();
app.MapSearchEndpoints();
app.MapHub<TelemetryHub>("/hubs/telemetry");
app.MapGet(
    "/health",
    (MqttConnectionStatus health) =>
        health.IsSubscribed ? Results.Ok("Ready") : Results.StatusCode(503)
);

app.Run();
