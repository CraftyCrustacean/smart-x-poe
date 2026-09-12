import { Bell, Search } from "lucide-react";

function Header() {
  return (
    <header className="h-20 px-6 flex items-center justify-between bg-white border-b border-slate-300">
      <div className="flex items-center gap-2 bg-white rounded rounded-full border border-slate-300 px-3 py-2 w-80">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent outline-none w-full text-sm"
        />
      </div>

      <button className="relative">
        <Bell size={20} className="text-slate-500" />
      </button>
    </header>
  );
}

export default Header;
