import { Link, NavLink } from 'react-router-dom';
import smartx_logo from '../assets/smartx_logo.svg';
import { RadioTower } from 'lucide-react';

function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white text-slate-900 flex flex-col border-r border-slate-300">
        <Link to="/" className="h-20 px-4 flex items-center gap-2 border-b border-slate-300">
        <img src={smartx_logo} alt="Smart-X logo" className="h-10 w-auto" />
        <span className="text-3xl font-bold">Smart-X</span>
        </Link>
      <nav className="flex flex-col gap-2 p-3">
        <NavLink
        to="/devices"
        className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded border border-transparent transition-colors ${
            isActive 
                ? 'bg-orange-300 text-slate-900' 
                : 'hover:border-orange-300 hover:bg-orange-100 text-slate-900 '
            }`
        }
        >
        <RadioTower size={18} strokeWidth={1} />
        <span>Device Details</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;