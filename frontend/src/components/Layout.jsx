import { useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

function Layout({ children }) {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main
          className={`flex-1 overflow-y-auto p-6 ${
            isLanding
              ? "bg-[linear-gradient(rgba(15,23,42,0.3),rgba(15,23,42,0.3)),url('/landing-bg.jpg')] bg-cover bg-center"
              : "bg-slate-50"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
