import { BrowserRouter, Routes, Route } from "react-router-dom";
import DeviceDetails from "./pages/DeviceDetails";
import DeviceList from "./pages/DeviceList";
import DeviceRegistration from "./pages/DeviceRegistration";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import FeatureDemo from "./pages/FeatureDemo";
import CommandStream from "./pages/CommandStream";
import CommandHistory from "./pages/CommandHistory";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/devices" element={<DeviceList />} />
            <Route path="/devices/:deviceId" element={<DeviceDetails />} />
            <Route path="/devices/new" element={<DeviceRegistration />} />
            <Route path="/feature" element={<FeatureDemo />} />
            <Route path="/command-stream" element={<CommandStream />} />
            <Route path="/command-history" element={<CommandHistory />} />
            <Route path="*"element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </>
  );
}

export default App;
