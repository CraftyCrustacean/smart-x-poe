namespace backend.Models.Topology;

public class Node : IHierarchyNode
{
    public required string DeviceId { get; set; }
    public required Provision.ProvisionData.DeviceCategory Category { get; set; }
    public required float Chainage { get; set; }
    public IEnumerable<IHierarchyNode> GetChildren()
    {
        return [];
    }
}
