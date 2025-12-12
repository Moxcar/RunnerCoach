import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  Calendar,
  Package,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  image_url: string | null;
  price: number;
  slug?: string | null;
  event_type?: string | null;
}

interface Plan {
  id: string;
  name: string;
  cost: number;
  features: string[];
}

// Componente para la tarjeta de evento
function EventCard({ event }: { event: Event }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Intentar cargar imagen desde storage si image_url es null pero hay slug
  const getImageUrl = () => {
    if (event.image_url) return event.image_url;

    // Si es Ultra Backyard, usar la imagen del logo SVG
    if (
      event.event_type === "ultra_backyard" ||
      (event.slug && event.slug.toLowerCase().includes("uby"))
    ) {
      return "/ubyprotrail.svg";
    }

    // Si no hay image_url pero hay slug, intentar construir URL desde storage
    if (event.slug) {
      // Intentar diferentes formatos de URL para imágenes de eventos
      const possibleUrls = [
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/storage/v1/object/public/event-images/${event.slug}.jpg`,
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/storage/v1/object/public/event-images/${event.slug}.png`,
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/events/${
          event.slug
        }.jpg`,
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/events/${
          event.slug
        }.png`,
      ];
      // Retornar el primer formato (se probará con onError)
      return possibleUrls[0];
    }

    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10">
        {imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10 z-10">
                <Calendar className="h-12 w-12 text-[#e9540d]/30 animate-pulse" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={event.name}
              className={`w-full h-full object-cover ${
                imageLoading ? "opacity-0" : "opacity-100"
              } transition-opacity duration-300`}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-[#e9540d]/30 mx-auto mb-2" />
              <p className="text-xs text-[#e9540d]/50 font-medium">
                {event.name}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-base">{event.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(event.date), "dd MMM yyyy", {
            locale: es,
          })}
        </p>
        {event.location && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span>📍</span>
            <span>{event.location}</span>
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
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingPayments: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
    nextPaymentDate: null as Date | null,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Obtener cliente asociado con plan (incluyendo características)
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, coach_id, plan_id, plans(id, name, cost, features)")
        .eq("user_id", user.id)
        .maybeSingle();

      // Cargar plan actual
      if (clientData?.plans && typeof clientData.plans === "object") {
        const plan = clientData.plans as Plan;
        setCurrentPlan(plan);

        // Calcular próxima fecha de pago del plan
        const { data: lastPlanPayment } = await supabase
          .from("payments")
          .select("date")
          .eq("client_user_id", user.id)
          .eq("amount", plan.cost)
          .eq("status", "completed")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextPaymentDate: Date;
        if (lastPlanPayment) {
          const lastDate = new Date(lastPlanPayment.date);
          nextPaymentDate = new Date(
            lastDate.getFullYear(),
            lastDate.getMonth() + 1,
            lastDate.getDate()
          );
        } else {
          const today = new Date();
          nextPaymentDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
          );
        }

        // Si la fecha calculada ya pasó, calcular el siguiente mes desde hoy
        const today = new Date();
        if (nextPaymentDate <= today) {
          nextPaymentDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
          );
        }

        setStats((prev) => ({
          ...prev,
          nextPaymentDate,
        }));
      } else {
        setCurrentPlan(null);
        setStats((prev) => ({
          ...prev,
          nextPaymentDate: null,
        }));
      }

      // Cargar pagos pendientes
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("client_user_id", user.id)
        .eq("status", "pending");

      if (payments) {
        setStats((prev) => ({
          ...prev,
          pendingPayments: payments.length,
        }));
      }

      // Cargar eventos inscritos (por user_id o por email) incluyendo slug, image_url y event_type
      const { data: registrationsByUser } = await supabase
        .from("event_registrations")
        .select(
          "event_id, events(id, name, date, location, image_url, price, slug, event_type)"
        )
        .eq("user_id", user.id);

      // También buscar registros por email si el usuario tiene email
      let registrationsByEmail: any[] = [];
      if (user.email) {
        const { data: emailRegistrations } = await supabase
          .from("event_registrations")
          .select(
            "event_id, events(id, name, date, location, image_url, price, slug, event_type)"
          )
          .eq("email", user.email.toLowerCase())
          .is("user_id", null);

        registrationsByEmail = emailRegistrations || [];
      }

      // Combinar ambos tipos de registros
      const allRegistrations = [
        ...(registrationsByUser || []),
        ...registrationsByEmail,
      ];

      // Eliminar duplicados por event_id
      const uniqueRegistrations = allRegistrations.reduce(
        (acc: any[], reg: any) => {
          if (!acc.find((r: any) => r.event_id === reg.event_id)) {
            acc.push(reg);
          }
          return acc;
        },
        []
      );

      if (uniqueRegistrations.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Eventos próximos (futuros)
        const upcoming = uniqueRegistrations
          .map((r: any) => r.events)
          .filter((e: any) => e && new Date(e.date) >= today)
          .sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(0, 3);

        // Eventos asistidos (pasados)
        const attended = uniqueRegistrations
          .map((r: any) => r.events)
          .filter((e: any) => e && new Date(e.date) < today);

        setUpcomingEvents(upcoming);
        setStats((prev) => ({
          ...prev,
          upcomingEvents: upcoming.length,
          attendedEvents: attended.length,
        }));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const statCards = [
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
    {
      title: "Eventos asistidos",
      value: stats.attendedEvents,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Próximo pago",
      value: stats.nextPaymentDate
        ? format(stats.nextPaymentDate, "dd MMM", { locale: es })
        : "N/A",
      icon: Calendar,
      color: "text-blue-600",
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
                <div className="flex items-center justify-between">
                  <CardTitle>Plan Actual</CardTitle>
                  {currentPlan && (
                    <Link to="/client/plans">
                      <Button variant="ghost" size="sm">
                        Ver detalles
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentPlan ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          {currentPlan.name}
                        </h3>
                      </div>
                      {currentPlan.features &&
                        currentPlan.features.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Características:
                            </p>
                            <ul className="space-y-1.5">
                              {currentPlan.features
                                .slice(0, 4)
                                .map((feature, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">
                                      {feature}
                                    </span>
                                  </li>
                                ))}
                              {currentPlan.features.length > 4 && (
                                <li className="text-xs text-muted-foreground pl-6">
                                  +{currentPlan.features.length - 4} más
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                    {stats.nextPaymentDate && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          Próximo pago:
                        </p>
                        <p className="text-base font-semibold">
                          {format(stats.nextPaymentDate, "dd 'de' MMMM yyyy", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    )}
                    <div className="pt-3">
                      <Link to="/client/plans">
                        <Button variant="outline" className="w-full">
                          Gestionar Plan
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center py-4">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        No tienes un plan activo
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Elige un plan para comenzar tu entrenamiento
                      </p>
                      <Button
                        onClick={() => navigate("/client/plans")}
                        className="w-full"
                      >
                        Elegir Plan
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
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
                  <Link to="/client/events">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tienes eventos próximos
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
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
