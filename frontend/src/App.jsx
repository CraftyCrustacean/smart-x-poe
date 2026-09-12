import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DeviceDetails from './pages/DeviceDetails'
import DeviceList from './pages/DeviceList'
import DeviceRegistration from './pages/DeviceRegistration'
import Landing from './pages/Landing';
import Layout from './components/Layout';

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
      </Routes>
    </Layout>
    </BrowserRouter>
    </>
  )
}

export default App
