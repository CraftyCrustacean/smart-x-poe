using backend.Services.State;
using backend.Settings;
using Microsoft.Extensions.Options;

namespace backend.Services.Mesh;

public sealed class MeshService
{
    private readonly DeviceRegistry _registry;
    private readonly MeshSettings _settings;
    private readonly ILogger<MeshService> _logger;
    private readonly Lock _topologyLock = new();
    private MeshTopology? _topology;

    public MeshService(
        DeviceRegistry registry,
        IOptions<MeshSettings> settings,
        ILogger<MeshService> logger
    )
    {
        _registry = registry;
        _settings = settings.Value;
        _logger = logger;
    }

    public MeshTopology GetTopology()
    {
        var current = Volatile.Read(ref _topology);
        if (current is not null && current.DeviceCount == _registry.Count)
            return current;

        lock (_topologyLock)
        {
            current = _topology;
            if (current is not null && current.DeviceCount == _registry.Count)
                return current;

            var built = MeshTopology.Build(_registry.Snapshot(), _settings);
            Volatile.Write(ref _topology, built);

            _logger.LogInformation(
                "Mesh topology built: {Vertices} vertices, {Links} links, {GatewayLinks} gateway links, in {Ms:F1} ms.",
                built.Vertices.Length,
                built.Links.Length,
                built.Adjacency[MeshTopology.Gateway].Length,
                built.BuildMs
            );

            return built;
        }
    }
}
