using smart_x_poe.backend.BackgroundServices;
using smart_x_poe.backend.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<MqttWorker>();
builder.Services.Configure<MqttSettings>(builder.Configuration.GetSection(MqttSettings.MqttSettingsName));
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");

app.Run();

