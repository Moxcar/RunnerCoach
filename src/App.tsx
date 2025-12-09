import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthGuard, RedirectIfAuthenticated } from "./components/AuthGuard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Payments from "./pages/Payments";
import Events from "./pages/Events";
import Settings from "./pages/Settings";
import ClientDashboard from "./pages/ClientDashboard";
import ClientPayments from "./pages/ClientPayments";
import ClientEvents from "./pages/ClientEvents";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthenticated>
                <Register />
              </RedirectIfAuthenticated>
            }
          />
          {/* Coach routes */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard requiredRole="coach">
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/clients"
            element={
              <AuthGuard requiredRole="coach">
                <Clients />
              </AuthGuard>
            }
          />
          <Route
            path="/payments"
            element={
              <AuthGuard requiredRole="coach">
                <Payments />
              </AuthGuard>
            }
          />
          <Route
            path="/events"
            element={
              <AuthGuard requiredRole="coach">
                <Events />
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          {/* Client routes */}
          <Route
            path="/client/dashboard"
            element={
              <AuthGuard requiredRole="client">
                <ClientDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/client/payments"
            element={
              <AuthGuard requiredRole="client">
                <ClientPayments />
              </AuthGuard>
            }
          />
          <Route
            path="/client/events"
            element={
              <AuthGuard requiredRole="client">
                <ClientEvents />
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
