import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div>
      <h1>Landing Page</h1>
      <Link to="/devices">View and register Devices</Link>
    </div>
  );
}

export default Landing;