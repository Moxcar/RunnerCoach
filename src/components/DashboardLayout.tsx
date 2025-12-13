import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import logo from "/logo.svg";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    planName: string;
    planCost: number;
  } | null>(null);

  const adminMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: Users, label: "Coaches", path: "/admin/coaches" },
    { icon: Users, label: "Clientes", path: "/admin/clients" },
    { icon: CreditCard, label: "Pagos", path: "/admin/payments" },
    { icon: Calendar, label: "Eventos", path: "/admin/events" },
    { icon: Package, label: "Planes", path: "/admin/plans" },
    { icon: Settings, label: "Configuración", path: "/settings" },
  ];

  const coachMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Clientes", path: "/clients" },
    { icon: CreditCard, label: "Pagos", path: "/payments" },
    { icon: Calendar, label: "Eventos", path: "/events" },
    { icon: Settings, label: "Configuración", path: "/settings" },
  ];

  const clientMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/client/dashboard" },
    { icon: CreditCard, label: "Mis Pagos", path: "/client/payments" },
    { icon: Calendar, label: "Eventos", path: "/client/events" },
    { icon: Package, label: "Planes", path: "/client/plans" },
  ];

  const menuItems =
    role === "admin"
      ? adminMenuItems
      : role === "coach"
      ? coachMenuItems
      : clientMenuItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Verificar si falta pagar el plan mensual (solo para clientes)
  useEffect(() => {
    const checkPlanPayment = async () => {
      if (!user || role !== "client") {
        setShowPaymentAlert(false);
        return;
      }

      try {
        // Obtener el plan actual del cliente
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("id, plan_id, plans(*)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientError && clientError.code !== "PGRST116") {
          console.error("Error loading client data:", clientError);
          return;
        }

        if (!clientData || !clientData.plan_id || !clientData.plans) {
          setShowPaymentAlert(false);
          return;
        }

        const plan = clientData.plans as {
          id: string;
          name: string;
          cost: number;
        };
        setPlanInfo({
          planName: plan.name,
          planCost: plan.cost,
        });

        // Buscar pagos pendientes del plan (si hay uno, no mostrar alerta)
        const { data: pendingPlanPayment } = await supabase
          .from("payments")
          .select("id")
          .eq("client_user_id", user.id)
          .eq("amount", plan.cost)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        // Si hay un pago pendiente, no mostrar alerta
        if (pendingPlanPayment) {
          setShowPaymentAlert(false);
          return;
        }

        // Buscar el último pago completado del plan
        const { data: lastPlanPayment } = await supabase
          .from("payments")
          .select("date")
          .eq("client_user_id", user.id)
          .eq("amount", plan.cost)
          .eq("status", "completed")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const today = new Date();
        const oneMonthAgo = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          today.getDate()
        );

        // Si no hay pagos completados o el último pago es de hace más de un mes, mostrar alerta
        if (!lastPlanPayment) {
          // Si no hay pagos previos, verificar si el cliente tiene más de un mes registrado
          const { data: clientCreated } = await supabase
            .from("clients")
            .select("created_at")
            .eq("id", clientData.id)
            .single();

          if (clientCreated) {
            const clientCreatedDate = new Date(clientCreated.created_at);
            if (clientCreatedDate <= oneMonthAgo) {
              setShowPaymentAlert(true);
            } else {
              setShowPaymentAlert(false);
            }
          }
        } else {
          const lastPaymentDate = new Date(lastPlanPayment.date);
          if (lastPaymentDate <= oneMonthAgo) {
            setShowPaymentAlert(true);
          } else {
            setShowPaymentAlert(false);
          }
        }
      } catch (error) {
        console.error("Error checking plan payment:", error);
        setShowPaymentAlert(false);
      }
    };

    checkPlanPayment();
  }, [user, role]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
          initial={false}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <img src={logo} alt="RunnerCoach" className="h-10" />
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <motion.div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t">
              <div className="px-4 py-2 text-sm text-muted-foreground mb-2">
                {user?.email}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden flex-shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold truncate">
              {menuItems.find((item) => item.path === location.pathname)
                ?.label || "Dashboard"}
            </h1>
          </header>

          {/* Alerta de pago pendiente del plan (solo para clientes) */}
          {showPaymentAlert && planInfo && role === "client" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border-b border-orange-200 px-4 sm:px-6 py-3 sm:py-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="font-semibold text-orange-900 text-sm sm:text-base">
                      Pago del plan pendiente
                    </p>
                    <p className="text-xs sm:text-sm text-orange-700">
                      Te falta pagar tu plan mensual{" "}
                      <strong>{planInfo.planName}</strong> ($
                      {planInfo.planCost.toLocaleString()} MXN).
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/client/plans")}
                  className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                  size="sm"
                >
                  Ir a Planes
                </Button>
              </div>
            </motion.div>
          )}

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
