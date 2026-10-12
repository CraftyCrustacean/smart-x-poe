import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-500 mb-4">
        The page you are looking for does not exist.
      </p>
      <Link to="/" className="text-orange-400 hover:underline">
        Try going back to the home page.
      </Link>
    </div>
  );
}

export default NotFound;
