// AppRoutes.jsx under src folderaa
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
// import { registerLicense } from '@syncfusion/ej2-base';
import Dashboard from './pages/Dashboard';
import ManageProducts from './pages/ManageProducts';
import ProductPreview from './pages/productPreview';
import Browse from './pages/browse';
import Cart from './pages/cart';


// Registering Syncfusion license key
/* registerLicense(
  'Ngo9BigBOggjHTQxAR8/V1NBaF5cXmZCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdnWXpdcHZXRGhZV0N3V0Q=',
); */

// registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<PublicRoutes />}>
        <Route index element={<Browse />} />
          <Route path="product-list" element={<h1>Product List</h1>} />
          <Route path="Login" element={<Login />} />
          <Route path="Register" element={<Signup />} />
          <Route path="signup" element={<Signup />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="update-password" element={<UpdatePassword />} />
          <Route path="product-preview" element={<ProductPreview />} />
        </Route>
        <Route path="logout" element={<Logout />} />
        <Route path="/dashboard" element={<PrivateRoutes />}>
          <Route index element={<Dashboard />} /> {/* Dashboard route */}
          <Route path="manage-products" element={<ManageProducts />} /> {/* Manage Products route */}
        </Route>
        <Route path="/app/*" element={<PrivateRoutes />}>
          <Route path="product-add" element={<h1>Product Add</h1>} />
          <Route path="checkout" element={<h1>checkout</h1>} />
          <Route path="thank-you" element={<h1>Thank You</h1>} />
        </Route>
        <Route path="product-list" element={<h1>Product List</h1>} />
        <Route path="/product/:id" element={<ProductPreview />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;

