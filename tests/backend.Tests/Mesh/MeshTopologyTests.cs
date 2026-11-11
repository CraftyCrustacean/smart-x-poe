using backend.Models.Provision;
using backend.Models.State;
using backend.Services.Mesh;
using backend.Services.State;
using backend.Settings;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using static backend.Models.Provision.ProvisionData;

namespace backend.Tests.Mesh;

public class MeshTopologyTests
{
    private const double Lat = -25.0;
    private const double Lon = 28.0;
    private const double KmPerDegreeLat = 111.195;

    private static readonly MeshSettings Settings = new();

    private static DeviceState Device(string id, double lat, double lon) =>
        new()
        {
            DeviceId = id,
            Category = DeviceCategory.FlowRate,
            Zone = "zone",
            Subzone = "Subzone-1",
            ChainageKm = 0,
            Latitude = lat,
            Longitude = lon,
        };

    private static double NorthKm(double km) => Lat + km / KmPerDegreeLat;

    [Fact]
    public void OneDegreeIs111Km()
    {
        Assert.InRange(MeshTopology.DistanceKm(0, 0, 1, 0), 111.19, 111.20);
        Assert.Equal(0, MeshTopology.DistanceKm(Lat, Lon, Lat, Lon));
        Assert.Equal(
            MeshTopology.DistanceKm(Lat, Lon, -26, 29),
            MeshTopology.DistanceKm(-26, 29, Lat, Lon),
            precision: 9
        );
    }

    [Fact]
    public void SameSpotJustHopCost()
    {
        var topology = MeshTopology.Build(
            [Device("A", Lat, Lon), Device("B", Lat, Lon), Device("C", Lat, Lon)],
            Settings
        );

        Assert.Equal(3, topology.Links.Length);
        Assert.All(topology.Links, l => Assert.Equal(0, l.DistanceKm));
        Assert.All(topology.Links, l => Assert.Equal((float)Settings.HopOverhead, l.Cost));
    }

    [Fact]
    public void RangeCutoffWorks()
    {
        var topology = MeshTopology.Build(
            [
                Device("A", Lat, Lon),
                Device("B", NorthKm(11.9), Lon),
                Device("C", NorthKm(12.1), Lon),
            ],
            Settings
        );
        int a = topology.IndexOf["A"], b = topology.IndexOf["B"], c = topology.IndexOf["C"];

        Assert.Contains(topology.Adjacency[a], e => e.To == b);
        Assert.DoesNotContain(topology.Adjacency[a], e => e.To == c);
        Assert.Contains(topology.Adjacency[b], e => e.To == c);

        var ab = topology.Adjacency[a].Single(e => e.To == b);
        Assert.Equal(11.9 * 11.9 + 1, ab.Cost, precision: 1);
    }

    [Fact]
    public void GatewayIsZeroAndLinksNearOnes()
    {
        var near = Device("NEAR", Settings.GatewayLatitude + 0.05, Settings.GatewayLongitude);
        var far = Device("FAR", Lat, Lon);

        var topology = MeshTopology.Build([near, far], Settings);

        var gateway = topology.Vertices[MeshTopology.Gateway];
        Assert.True(gateway.IsGateway);
        Assert.Equal(Settings.GatewayId, gateway.Id);
        Assert.Contains(topology.Adjacency[MeshTopology.Gateway], e => e.To == topology.IndexOf["NEAR"]);
        Assert.DoesNotContain(topology.Adjacency[MeshTopology.Gateway], e => e.To == topology.IndexOf["FAR"]);
    }

    [Fact]
    public void SortedIdsAndLinksMatch()
    {
        var topology = MeshTopology.Build(
            [Device("C", Lat, Lon), Device("A", NorthKm(5), Lon), Device("B", NorthKm(10), Lon)],
            Settings
        );

        Assert.Equal(new[] { Settings.GatewayId, "A", "B", "C" }, topology.Vertices.Select(v => v.Id));
        Assert.Equal(3, topology.DeviceCount);

        Assert.Equal(topology.Links.Length * 2, topology.Adjacency.Sum(list => list.Length));
        foreach (var link in topology.Links)
        {
            Assert.True(link.A < link.B);
            Assert.Contains(topology.Adjacency[link.A], e => e.To == link.B && e.Cost == link.Cost);
            Assert.Contains(topology.Adjacency[link.B], e => e.To == link.A && e.Cost == link.Cost);
        }
    }

    [Fact]
    public void EmptyIsJustGateway()
    {
        var topology = MeshTopology.Build([], Settings);

        Assert.Single(topology.Vertices);
        Assert.Empty(topology.Links);
        Assert.Equal(0, topology.DeviceCount);
    }

    private static ProvisionData Provision(string id, double lat) =>
        new()
        {
            DeviceId = id,
            MacAddress = id,
            Category = DeviceCategory.FlowRate,
            ProductType = "test",
            FirmwareVersion = "1.0.0",
            ProvisionedAt = DateTime.UtcNow,
            Status = DeviceStatus.active,
            LocationData = new LocationData
            {
                Latitude = (float)lat,
                Longitude = (float)Lon,
                Chainage = 0,
            },
            TopologyData = new TopologyData
            {
                Region = "South Africa",
                Zone = "zone",
                Subzone = "Subzone-1",
            },
        };

    [Fact]
    public void OnlyRebuildsOnNewDevice()
    {
        var registry = new DeviceRegistry();
        var service = new MeshService(
            registry,
            Options.Create(Settings),
            NullLogger<MeshService>.Instance
        );

        registry.Register(Provision("A", Lat));
        var first = service.GetTopology();

        Assert.Same(first, service.GetTopology());

        registry.Register(Provision("B", NorthKm(5)));
        var second = service.GetTopology();

        Assert.NotSame(first, second);
        Assert.Equal(2, second.DeviceCount);
        Assert.Equal(1, first.DeviceCount);
    }
}
