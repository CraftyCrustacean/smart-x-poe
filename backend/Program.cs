using backend.BackgroundServices;
using backend.Services;
using backend.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<MqttWorker>();
builder.Services.AddSingleton<DeviceRegistry>();
builder.Services.AddSingleton<TelemetryBatcher>();
builder.Services.AddSingleton<EnvironmentalHistory>();
builder.Services.AddSingleton<TelemetryProcessor>();
builder.Services.Configure<MqttSettings>(builder.Configuration.GetSection(MqttSettings.MqttSettingsName));
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");

app.Run();

