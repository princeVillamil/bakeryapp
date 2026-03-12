import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./pages/Authcontext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import AddStock from "./pages/AddStock";
import Management from "./pages/Management";
import Profile from "./pages/Profile";
import AuthPage from "./pages/AuthPage";


import DailySalesReport from "./pages/Dailysalesreport";
import Expenses from "./pages/Expenses";

import AddSale from "./pages/AddSale";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* <Route path="/" element={<Dashboard />} /> */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/add-stock" element={<AddStock />} />
            <Route path="/management" element={<Management />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/sales"   element={<DailySalesReport/>} />
            <Route path="/expenses" element={<Expenses/>} />

            <Route path="/add-sale" element={<AddSale/>}/>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
