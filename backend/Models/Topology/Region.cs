namespace backend.Models.Topology;

public class Region : IHierarchyNode
{
    public string Identifier => RegionId;
    public required string RegionId { get; set; }
    public List<Zone> Zones { get; set; } = new();
    public IEnumerable<IHierarchyNode> GetChildren() => Zones;
}
