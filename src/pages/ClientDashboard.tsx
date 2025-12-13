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
  MapPin,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getEventUrl } from "@/lib/utils";

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

// Componente para la tarjeta de evento - diseño compacto horizontal
function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isUltraBackyard =
    event.event_type === "ultra_backyard" ||
    (event.slug && event.slug.toLowerCase().includes("uby"));

  const getImageUrl = () => {
    if (event.image_url) return event.image_url;

    // Si es Ultra Backyard, no retornar URL de imagen (se maneja con fondo)
    if (isUltraBackyard) {
      return null;
    }

    // Si no hay image_url pero hay slug, intentar construir URL desde storage
    if (event.slug) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Retornar el primer formato (se probará con onError)
      return `${supabaseUrl}/storage/v1/object/public/event-images/${event.slug}.jpg`;
    }

    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <div
      className="flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:shadow-md hover:border-primary/30 transition-all cursor-pointer bg-card"
      onClick={() => navigate(getEventUrl(event))}
    >
      {/* Imagen/Icono - tamaño aumentado */}
      <div className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-lg overflow-hidden bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10 border border-border/50">
        {isUltraBackyard ? (
          <>
            {/* Fondo para Ultra Backyard */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url('/event-background-gradient.png')`,
              }}
            />
            {/* Logo SVG: ubyprotrail.svg centrado */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <img
                src="/ubyprotrail.svg"
                alt="UBYPROTRAIL"
                className="w-3/4 max-w-[80px] sm:max-w-[100px] h-auto opacity-90"
              />
            </div>
          </>
        ) : imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#e9540d]/10 to-[#b07a1e]/10 z-10">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-[#e9540d]/30 animate-pulse" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={event.name}
              className={`w-full h-full object-contain ${
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
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-[#e9540d]/40" />
          </div>
        )}
      </div>

      {/* Info del evento */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="font-semibold text-base sm:text-lg text-foreground line-clamp-2 mb-1.5">
          {event.name}
        </h4>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0 text-primary/70" />
          <span>
            {format(new Date(event.date), "dd MMM yyyy", { locale: es })}
          </span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0 text-primary/70" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        <div className="mt-2">
          <span className="text-sm sm:text-base font-bold">
            {event.price === 0 ? (
              <span className="text-green-600">Gratis</span>
            ) : (
              <span className="text-primary">
                ${event.price.toLocaleString()} MXN
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Flecha indicadora */}
      <div className="flex-shrink-0 flex items-center">
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
