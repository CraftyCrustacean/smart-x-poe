namespace backend.Services.State;

public sealed class BatchClock
{
    private long _closed;

    public long Current => Interlocked.Read(ref _closed);

    public long Advance() => Interlocked.Increment(ref _closed);
}
