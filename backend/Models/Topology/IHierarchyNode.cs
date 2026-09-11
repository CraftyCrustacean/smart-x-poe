namespace backend.Models.Topology;

public interface IHierarchyNode
{
    string Identifier { get; }
    IEnumerable<IHierarchyNode> GetChildren();
}
