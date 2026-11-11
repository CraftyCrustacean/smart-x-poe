const normalise = (s) => s.replace(/[\s:-]/g, "").toUpperCase();

export default function Highlight({ id, q }) {
  const needle = normalise(q);
  const positions = [];
  let norm = "";
  for (let i = 0; i < id.length; i++) {
    if (/[\s:-]/.test(id[i])) continue;
    positions.push(i);
    norm += id[i].toUpperCase();
  }
  const at = needle ? norm.indexOf(needle) : -1;
  if (at < 0) return id;
  const start = positions[at];
  const end = positions[at + needle.length - 1] + 1;
  return (
    <>
      {id.slice(0, start)}
      <mark className="bg-orange-100 text-slate-900 rounded-sm">
        {id.slice(start, end)}
      </mark>
      {id.slice(end)}
    </>
  );
}
