namespace backend.Models.Topology;

public class SubZone : IHierarchyNode
{
    public required string SubZoneId { get; set; }
    public List<Node> Nodes { get; set; } = new();
    public IEnumerable<IHierarchyNode> GetChildren() => Nodes;
}
