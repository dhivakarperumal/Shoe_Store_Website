import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./PrivateRouter/AuthContext.jsx";
import { StoreProvider } from "./PrivateRouter/StoreContext.jsx";
import PrivateRoute from "./PrivateRouter/PrivateRouter.jsx";
import { AdminProvider } from "./PrivateRouter/AdminContext.jsx";
import { Toaster } from "react-hot-toast";
import Loader from "./Components/CommenComponents/Loader.jsx";

// Lazy Load Main Components
const Home = React.lazy(() => import("./Components/Home/Home.jsx"));
const AboutUs = React.lazy(() => import("./Components/About/AboutUs.jsx"));
const ShopPage = React.lazy(() => import("./Components/Pages/AllProducts.jsx"));

const Login = React.lazy(() => import("./Components/Auth/Login.jsx"));
const Register = React.lazy(() => import("./Components/Auth/Register.jsx"));

// Lazy Load Admin Components
const AdminPanel = React.lazy(() => import("./Admin/AdminPanel.jsx"));
const Dashboard = React.lazy(() => import("./Admin/Dashboard.jsx"));
const Banners = React.lazy(() => import("./Admin/Banners/Banners.jsx"));
const Category = React.lazy(() => import("./Admin/Categories/Category.jsx"));
const AllProducts = React.lazy(() => import("./Admin/Products/AllProducts.jsx"));
const AddProducts = React.lazy(() => import("./Admin/Products/AddProducts.jsx"));
const ProductDetail = React.lazy(() => import("./Admin/Products/ProductDetail.jsx"));
const Users = React.lazy(() => import("./Admin/Customers/Users.jsx"));

const ErrorPage = React.lazy(() => import("./Admin/Pages/ErrorPage.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      { path: "about", element: <AboutUs /> },
      { path: "shop", element: <ShopPage /> },

    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/admin",
    element: (
      <PrivateRoute allowedRoles={["admin"]}>
        <AdminProvider>
          <AdminPanel />
        </AdminProvider>
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "banners", element: <Banners /> },
      { path: "products/all", element: <AllProducts /> },
      { path: "products/add", element: <AddProducts /> },
      { path: "products/edit/:id", element: <AddProducts /> },
      { path: "products/:id", element: <ProductDetail /> },
      { path: "products/category", element: <Category /> },
      { path: "users/all", element: <Users /> },
     
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="92181265196-n9a9p26qe601hg7lar8acq6s4f1cknq7.apps.googleusercontent.com">
    <AuthProvider>
      <StoreProvider>
        <Toaster position="top-left" reverseOrder={false} />
        <React.Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </React.Suspense>
      </StoreProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
