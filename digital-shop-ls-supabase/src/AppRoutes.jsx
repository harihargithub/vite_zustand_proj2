import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/signin';
import Signup from './pages/signup';
import PrivateRoutes from './routes/private';
import PublicRoutes from './routes/public';
import NotFound from './pages/page404';
import Navbar from './components/navbar';
import Logout from './pages/logout';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import ManageProducts from './pages/ManageProducts';
import ProductPreview from './pages/productPreview';
import Browse from './pages/browse';
import Cart from './pages/cart';
import ProductList from './pages/productsList';
import Checkout from './pages/checkout';
import ThankYou from './pages/thankyou';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="product/:id" element={<ProductPreview />} /> {/* Move this line here */}
        <Route path="/*" element={<PublicRoutes />}>
          <Route index element={<Browse />} />
          <Route path="product-list" element={<ProductList />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Signup />} />
          <Route path="signup" element={<Signup />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="update-password" element={<UpdatePassword />} />
          <Route path="browse" element={<Browse />} />
        </Route>
        <Route path="logout" element={<Logout />} />
        <Route path="/dashboard/*" element={<PrivateRoutes />}>
          <Route index element={<Dashboard />} />
          <Route path="manage-products" element={<ManageProducts />} />
          <Route path="cart" element={<Cart />} />
        </Route>
        <Route path="/app/*" element={<PrivateRoutes />}>
          <Route path="product-add" element={<h1>Product Add</h1>} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="thank-you" element={<ThankYou />} />
        </Route>
        <Route path="/*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;