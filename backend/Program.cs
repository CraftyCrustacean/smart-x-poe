using backend.BackgroundServices;
using backend.Endpoints;
using backend.Services;
using backend.Settings;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.Configure<MqttSettings>(builder.Configuration.GetSection(MqttSettings.MqttSettingsName));
builder.Services.Configure<DbSettings>(builder.Configuration.GetSection(DbSettings.DbSettingsName));
var dbSettings = builder.Configuration.GetSection(DbSettings.DbSettingsName).Get<DbSettings>();
builder.Services.AddHealthChecks();

string connectionString = (
    $"Host={dbSettings.DbHost};" +
    $"Port={dbSettings.DbPort};" +
    $"Database={dbSettings.DbName};" +
    $"Username={dbSettings.DbUser};" +
    $"Password={dbSettings.DbPassword}");

builder.Services.AddNpgsqlDataSource(connectionString);

var app = builder.Build();

app.MapDeviceEndpoints();
app.MapFileEndpoints();
app.MapTopologyEndpoints();
app.MapTelemetryEndpoints();
app.MapGet("/health", (MqttConnectionStatus health) =>
    health.IsSubscribed ? Results.Ok("Ready") : Results.StatusCode(503));

app.Run();
