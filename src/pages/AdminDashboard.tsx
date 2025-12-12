import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getAdminStats } from "@/services/adminService";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCoaches: 0,
    approvedCoaches: 0,
    pendingCoaches: 0,
    totalClients: 0,
    clientsWithoutCoach: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Coaches Totales",
      value: stats.totalCoaches,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      link: "/admin/coaches",
    },
    {
      title: "Coaches Aprobados",
      value: stats.approvedCoaches,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      link: "/admin/coaches",
    },
    {
      title: "Coaches Pendientes",
      value: stats.pendingCoaches,
      icon: UserX,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      link: "/admin/coaches",
      highlight: stats.pendingCoaches > 0,
    },
    {
      title: "Clientes Totales",
      value: stats.totalClients,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      link: "/admin/clients",
    },
    {
      title: "Clientes Sin Coach",
      value: stats.clientsWithoutCoach,
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      link: "/admin/clients",
      highlight: stats.clientsWithoutCoach > 0,
    },
    {
      title: "Ingresos Totales",
      value: `$${stats.totalRevenue.toFixed(2)} MXN`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      link: "/admin/payments",
    },
    {
      title: "Pagos Pendientes",
      value: `$${stats.pendingPayments.toFixed(2)} MXN`,
      icon: Clock,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      link: "/admin/payments",
      highlight: stats.pendingPayments > 0,
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona coaches, clientes, pagos y eventos de la plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={card.link}>
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      card.highlight ? "ring-2 ring-yellow-500" : ""
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg ${card.bgColor}`}>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/admin/coaches">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Coaches
                </Button>
              </Link>
              <Link to="/admin/clients">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Clientes
                </Button>
              </Link>
              <Link to="/admin/payments">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Gestionar Pagos
                </Button>
              </Link>
              <Link to="/admin/events">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Gestionar Eventos
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.pendingCoaches > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {stats.pendingCoaches} coach
                      {stats.pendingCoaches !== 1 ? "es" : ""} pendiente
                      {stats.pendingCoaches !== 1 ? "s" : ""} de aprobación
                    </p>
                    <Link
                      to="/admin/coaches"
                      className="text-sm text-primary hover:underline"
                    >
                      Ver y aprobar →
                    </Link>
                  </div>
                </div>
              )}
              {stats.clientsWithoutCoach > 0 && (
                <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {stats.clientsWithoutCoach} cliente
                      {stats.clientsWithoutCoach !== 1 ? "s" : ""} sin coach
                      asignado
                    </p>
                    <Link
                      to="/admin/clients"
                      className="text-sm text-primary hover:underline"
                    >
                      Asignar coaches →
                    </Link>
                  </div>
                </div>
              )}
              {stats.pendingPayments > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium">
                      ${stats.pendingPayments.toFixed(2)} MXN en pagos
                      pendientes
                    </p>
                    <Link
                      to="/admin/payments"
                      className="text-sm text-primary hover:underline"
                    >
                      Revisar pagos →
                    </Link>
                  </div>
                </div>
              )}
              {stats.pendingCoaches === 0 &&
                stats.clientsWithoutCoach === 0 &&
                stats.pendingPayments === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No hay alertas pendientes. Todo está al día.
                  </p>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

