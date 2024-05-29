// eCommApp.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Register from './pages/register';
import Logout from './pages/logout';
import PrivateRoutes from './routes/private';
import PublicRoutes from './routes/public';
import Navbar from './components/navbar';

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<PublicRoutes />}>
          <Route index element={<h1>Browse</h1>} />
          <Route path="product-list" element={<h1>Product List</h1>} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route path="logout" element={<Logout />} />
        <Route path="/dashboard" element={<PrivateRoutes />}>
          <Route index element={<h1>Dashboard</h1>} />
        </Route>
        <Route path="/app/*" element={<PrivateRoutes />}>
          <Route path="product-add" element={<h1>Product Add</h1>} />
          <Route path="checkout" element={<h1>checkout</h1>} />
          <Route path="thank-you" element={<h1>Thank You</h1>} />
          <Route path="product-list" element={<h1>Product List</h1>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
