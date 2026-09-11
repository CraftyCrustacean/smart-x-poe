namespace backend.Services;

public class PipelineData
{
    private Dictionary<string, float> _pipelineLength = new()
    {
        { "richards_bay_durban", 154f },
        { "sasolburg_durban", 521f },
        { "durban_johannesburg_a", 634f},
        { "durban_johannesburg_b", 650f}
    };

    public bool TryGetPipeLength(string id, out float length)
    {

        return _pipelineLength.TryGetValue(id, out length);

    }
}
