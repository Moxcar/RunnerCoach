import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Clock, Calendar, MapPin } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeClients: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    upcomingEvents: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Obtener clientes activos del coach
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("coach_id", user.id);

      if (clientsError) throw clientsError;

      const activeClientsCount = clients?.length || 0;

      // Obtener todos los pagos del coach
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount, status, date")
        .eq("coach_id", user.id);

      if (paymentsError) throw paymentsError;

      // Calcular ingresos totales (solo pagos completados)
      const totalRevenue =
        Math.round(
          (payments
            ?.filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) ||
            0) * 100
        ) / 100;

      // Contar pagos pendientes
      const pendingPaymentsCount =
        payments?.filter((p) => p.status === "pending").length || 0;

      // Obtener eventos próximos del coach
      const today = new Date().toISOString().split("T")[0];
      const { data: upcomingEventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, name, date, location, image_url, price")
        .eq("coach_id", user.id)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      if (eventsError) throw eventsError;

      const upcomingEventsCount = upcomingEventsData?.length || 0;
      setUpcomingEvents(upcomingEventsData || []);

      // Generar datos del gráfico basados en pagos reales
      const chartDataMap = new Map<string, number>();
      const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];

      // Procesar pagos completados y agrupar por mes
      payments
        ?.filter((p) => p.status === "completed")
        .forEach((payment) => {
          const date = new Date(payment.date);
          const monthKey = `${
            monthNames[date.getMonth()]
          } ${date.getFullYear()}`;
          const currentAmount = chartDataMap.get(monthKey) || 0;
          const paymentAmount = parseFloat(payment.amount.toString());
          chartDataMap.set(
            monthKey,
            Math.round((currentAmount + paymentAmount) * 100) / 100
          );
        });

      // Crear array con los últimos 6 meses, incluyendo meses sin datos
      const currentDate = new Date();
      const chartDataArray = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        const ingresos = chartDataMap.get(monthKey) || 0;
        chartDataArray.push({ month: monthKey, ingresos });
      }

      setStats({
        activeClients: activeClientsCount,
        totalRevenue,
        pendingPayments: pendingPaymentsCount,
        upcomingEvents: upcomingEventsCount,
      });

      setChartData(chartDataArray);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const statCards = [
    {
      title: "Clientes activos",
      value: stats.activeClients,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total recaudado",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Pagos pendientes",
      value: stats.pendingPayments,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      title: "Próximos eventos",
      value: stats.upcomingEvents,
      icon: Calendar,
      color: "text-purple-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Ingresos mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#e9540d"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Próximos eventos</CardTitle>
                  <Link to="/events">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay eventos próximos
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        {event.image_url ? (
                          <div className="w-full h-32 overflow-hidden bg-gray-200">
                            <img
                              src={event.image_url}
                              alt={event.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10 flex items-center justify-center">
                            <Calendar className="h-8 w-8 text-[#e9540d]/30" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.date), "dd MMM yyyy", {
                              locale: es,
                            })}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                          <div className="mt-2">
                            <span className="text-sm font-semibold">
                              {event.price === 0 ? (
                                <span className="text-green-600">Gratis</span>
                              ) : (
                                `$${event.price.toLocaleString()} MXN`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
