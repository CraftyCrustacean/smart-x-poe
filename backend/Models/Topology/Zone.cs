namespace backend.Models.Topology;

public class Zone : IHierarchyNode
{
    public string Identifier => ZoneId;
    public required string ZoneId { get; set; }
    public List<SubZone> SubZones { get; set; } = new();
    public IEnumerable<IHierarchyNode> GetChildren() => SubZones;
}

