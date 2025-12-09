import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "coach" | "client";
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRole,
  redirectTo,
}: AuthGuardProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se inicializa
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requiere un rol específico
  if (requiredRole) {
    // Si aún no se ha cargado el rol, esperar
    if (role === null) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Si el rol no coincide, redirigir según el rol
    if (role !== requiredRole) {
      const defaultRedirect = role === "coach" ? "/dashboard" : "/client/dashboard";
      return <Navigate to={redirectTo || defaultRedirect} replace />;
    }
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se inicializa
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si hay usuario autenticado, redirigir según el rol
  if (user && role) {
    const redirectTo = role === "coach" ? "/dashboard" : "/client/dashboard";
    const from = (location.state as any)?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // Si hay usuario pero aún no hay rol, esperar
  if (user && role === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

