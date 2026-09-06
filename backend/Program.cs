using smart_x_poe.backend.BackgroundServices;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<MqttWorker>();

var app = builder.Build();

app.Run();

