namespace backend.Models.Topology;

public interface IHierarchyNode
{
    IEnumerable<IHierarchyNode> GetChildren();
}
