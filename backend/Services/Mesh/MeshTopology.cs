using System.Diagnostics;
using backend.Models.Mesh;
using backend.Models.State;
using backend.Settings;

namespace backend.Services.Mesh;

public sealed class MeshTopology
{
    public const int Gateway = 0;

    private const double EarthRadiusKm = 6371.0088;

    public MeshVertex[] Vertices { get; }

    public MeshEdge[][] Adjacency { get; }

    public MeshLink[] Links { get; }

    public IReadOnlyDictionary<string, int> IndexOf { get; }

    public double BuildMs { get; }

    public int DeviceCount => Vertices.Length - 1;

    private MeshTopology(
        MeshVertex[] vertices,
        MeshEdge[][] adjacency,
        MeshLink[] links,
        IReadOnlyDictionary<string, int> indexOf,
        double buildMs
    )
    {
        Vertices = vertices;
        Adjacency = adjacency;
        Links = links;
        IndexOf = indexOf;
        BuildMs = buildMs;
    }

    public static MeshTopology Build(IEnumerable<DeviceState> devices, MeshSettings settings)
    {
        var started = Stopwatch.GetTimestamp();

        var ordered = devices.OrderBy(d => d.DeviceId, StringComparer.Ordinal).ToArray();

        var vertices = new MeshVertex[ordered.Length + 1];
        vertices[Gateway] = new MeshVertex(
            settings.GatewayId,
            settings.GatewayLatitude,
            settings.GatewayLongitude,
            null,
            null,
            null,
            null,
            true
        );
        for (var i = 0; i < ordered.Length; i++)
        {
            var d = ordered[i];
            vertices[i + 1] = new MeshVertex(
                d.DeviceId,
                d.Latitude,
                d.Longitude,
                d.Zone,
                d.Subzone,
                d.Category,
                d.ChainageKm,
                false
            );
        }

        var neighbours = new List<MeshEdge>[vertices.Length];
        for (var v = 0; v < vertices.Length; v++)
            neighbours[v] = [];

        var links = new List<MeshLink>();

        for (var a = 0; a < vertices.Length; a++)
        {
            for (var b = a + 1; b < vertices.Length; b++)
            {
                var km = DistanceKm(
                    vertices[a].Latitude,
                    vertices[a].Longitude,
                    vertices[b].Latitude,
                    vertices[b].Longitude
                );
                if (km > settings.RadioRangeKm)
                    continue;

                var cost = (float)(km * km + settings.HopOverhead);

                links.Add(new MeshLink(a, b, (float)km, cost));
                neighbours[a].Add(new MeshEdge(b, cost));
                neighbours[b].Add(new MeshEdge(a, cost));
            }
        }

        var indexOf = new Dictionary<string, int>(vertices.Length);
        for (var v = 0; v < vertices.Length; v++)
            indexOf.Add(vertices[v].Id, v);

        var adjacency = new MeshEdge[vertices.Length][];
        for (var v = 0; v < vertices.Length; v++)
            adjacency[v] = [.. neighbours[v]];

        return new MeshTopology(
            vertices,
            adjacency,
            [.. links],
            indexOf,
            Stopwatch.GetElapsedTime(started).TotalMilliseconds
        );
    }

    public static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var phi1 = double.DegreesToRadians(lat1);
        var phi2 = double.DegreesToRadians(lat2);
        var halfDeltaPhi = double.DegreesToRadians(lat2 - lat1) / 2;
        var halfDeltaLambda = double.DegreesToRadians(lon2 - lon1) / 2;

        var h =
            Math.Sin(halfDeltaPhi) * Math.Sin(halfDeltaPhi)
            + Math.Cos(phi1) * Math.Cos(phi2) * Math.Sin(halfDeltaLambda) * Math.Sin(halfDeltaLambda);

        return 2 * EarthRadiusKm * Math.Asin(Math.Sqrt(Math.Min(1, h)));
    }
}
