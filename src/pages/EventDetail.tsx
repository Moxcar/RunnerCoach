import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Trophy,
  Award,
  Mountain,
  Timer,
  CheckCircle,
  ExternalLink,
  Flame,
  Target,
  Zap,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import logo from "/logo.svg";
import ubyLogo from "/ubyprotrail.svg";
import eventBackground from "/event-background.png";
import { useScroll, useTransform } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  max_capacity: number | null;
  registered_clients?: number;
  // Extended fields (optional)
  loop_distance?: number | null;
  loop_elevation?: number | null;
  loop_duration?: number | null;
  prize_pool?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  registration_deadline?: string | null;
  event_type?: string | null;
  external_registration_url?: string | null;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] =
    useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setEvent(data as Event);

        // Contar inscripciones
        const { count } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", id);

        setRegisteredCount(count || 0);

        // Verificar si el usuario actual está registrado
        if (user) {
          const { data: registration } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", id)
            .eq("user_id", user.id)
            .single();

          setIsRegistered(!!registration);
        }
      }
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // Si hay URL externa, redirigir ahí
    if (event?.external_registration_url) {
      window.open(event.external_registration_url, "_blank");
      return;
    }

    if (!user) {
      // Abrir diálogo de registro sin cuenta
      setIsRegistrationDialogOpen(true);
      return;
    }
    // Si el usuario está autenticado, registrar directamente
    registerUserToEvent();
  };

  const registerUserToEvent = async () => {
    if (!user || !event) return;

    setRegistering(true);
    setRegistrationError("");

    try {
      // Obtener client_id del usuario
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!clientData) {
        throw new Error(
          "No estás asociado a ningún coach. Contacta a tu coach para que te agregue como cliente."
        );
      }

      // Registrar al evento
      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        user_id: user.id,
        client_id: clientData.id,
      });

      if (error) {
        if (error.code === "23505") {
          // Duplicate key - ya está registrado
          setIsRegistered(true);
          setRegistrationError("Ya estás registrado a este evento");
        } else {
          throw error;
        }
      } else {
        setIsRegistered(true);
        setRegisteredCount((prev) => prev + 1);
        // Enviar correo de confirmación (opcional, implementar después)
      }
    } catch (error: any) {
      console.error("Error registering for event:", error);
      setRegistrationError(error.message || "Error al registrarse al evento");
    } finally {
      setRegistering(false);
    }
  };

  const handleRegisterWithEmail = async () => {
    if (!event || !registrationEmail) {
      setRegistrationError("Por favor, ingresa tu email");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrationEmail)) {
      setRegistrationError("Por favor, ingresa un email válido");
      return;
    }

    setRegistering(true);
    setRegistrationError("");

    try {
      // Registrar al evento con email
      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        email: registrationEmail.toLowerCase().trim(),
        user_id: null,
        client_id: null,
      });

      if (error) {
        if (error.code === "23505") {
          setRegistrationError("Este email ya está registrado a este evento");
        } else {
          throw error;
        }
      } else {
        setRegistrationSuccess(true);
        setRegisteredCount((prev) => prev + 1);
        // Aquí podrías implementar el envío de correo de confirmación
        // Por ahora solo mostramos el mensaje de éxito
      }
    } catch (error: any) {
      console.error("Error registering with email:", error);
      setRegistrationError(error.message || "Error al registrarse al evento");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e9540d] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Evento no encontrado</h1>
          <Button onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const isFull = event.max_capacity && registeredCount >= event.max_capacity;
  const spotsLeft = event.max_capacity
    ? event.max_capacity - registeredCount
    : null;

  // Parse description into sections with improved detection
  const parseDescription = (desc: string) => {
    const sections: { title?: string; content: string; type?: string }[] = [];
    const lines = desc.split("\n").filter((line) => line.trim());

    let currentSection: {
      title?: string;
      content: string;
      type?: string;
    } | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Check if it's a section title (all caps, has markers, or specific patterns)
      const isTitle =
        trimmed.length > 0 &&
        (trimmed === trimmed.toUpperCase() ||
          trimmed.startsWith("**") ||
          trimmed.startsWith("#") ||
          trimmed.match(/^[A-ZÁÉÍÓÚÑ\s#]+$/) ||
          trimmed.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+:/)); // Pattern: "Título:"

      if (isTitle) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        // Start new section
        const normalizedTitle = trimmed
          .replace(/\*\*/g, "")
          .replace(/#/g, "")
          .replace(/:/g, "")
          .trim()
          .toUpperCase();

        const isProgram =
          normalizedTitle.includes("PROGRAMA") ||
          normalizedTitle.includes("VIERNES") ||
          normalizedTitle.includes("SÁBADO") ||
          normalizedTitle.includes("DOMINGO") ||
          normalizedTitle.includes("HORARIO");
        const isMaterial =
          normalizedTitle.includes("MATERIAL") ||
          normalizedTitle.includes("SUGERIDO") ||
          normalizedTitle.includes("EQUIPO");
        const isChallenge =
          normalizedTitle.includes("DESAFÍO") ||
          normalizedTitle.includes("MALTRÁTATE") ||
          normalizedTitle.includes("RETO");
        const isRules =
          normalizedTitle.includes("REGLAS") ||
          normalizedTitle.includes("REGLAMENTO") ||
          normalizedTitle.includes("NORMAS");
        const isPrizes =
          normalizedTitle.includes("PREMIO") ||
          normalizedTitle.includes("PREMIA") ||
          normalizedTitle.includes("CATEGORÍAS");
        const isRegistration =
          normalizedTitle.includes("INSCRIPCIÓN") ||
          normalizedTitle.includes("REGISTRO") ||
          normalizedTitle.includes("PAGO");

        currentSection = {
          title: trimmed
            .replace(/\*\*/g, "")
            .replace(/#/g, "")
            .replace(/:/g, "")
            .trim(),
          content: "",
          type: isProgram
            ? "program"
            : isMaterial
            ? "material"
            : isChallenge
            ? "challenge"
            : isRules
            ? "rules"
            : isPrizes
            ? "prizes"
            : isRegistration
            ? "registration"
            : undefined,
        };
      } else if (currentSection) {
        currentSection.content +=
          (currentSection.content ? "\n" : "") + trimmed;
      } else {
        // First content without title
        if (!currentSection) {
          currentSection = { content: "" };
        }
        currentSection.content +=
          (currentSection.content ? "\n" : "") + trimmed;
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{ content: desc }];
  };

  const descriptionSections = event.description
    ? parseDescription(event.description)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="RunnerCoach" className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                variant="ghost"
                onClick={() => navigate("/client/dashboard")}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild className="bg-[#e9540d] hover:bg-[#d14a0b]">
                  <Link to="/register">Registrarse</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Screen Immersive Editorial Premium */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background - Dynamic based on event type */}
        {event.event_type === "ultra_backyard" || !event.image_url ? (
          <div className="absolute inset-0">
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              className="absolute inset-0"
            >
              <img
                src={eventBackground}
                alt="Event background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#e9540d]/20 via-transparent to-transparent" />
            </motion.div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <motion.div
              style={{ y: heroY, opacity: heroOpacity }}
              className="absolute inset-0"
            >
              <img
                src={event.image_url}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
            </motion.div>
          </div>
        )}

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Logo for Ultra Backyard */}
            {event.event_type === "ultra_backyard" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-8 flex justify-center"
              >
                <img
                  src={ubyLogo}
                  alt="Ultra Backyard"
                  className="h-24 md:h-32 lg:h-40 w-auto"
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Badge className="mb-6 bg-[#e9540d]/30 text-white border-[#e9540d]/50 px-5 py-2 text-sm font-bold inline-flex items-center gap-2 backdrop-blur-sm">
                <Flame className="h-4 w-4" />
                {event.event_type === "ultra_backyard"
                  ? "ULTRA BACKYARD"
                  : "EVENTO PREMIUM"}
              </Badge>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black mb-6 md:mb-8 text-white leading-[0.9] tracking-tighter px-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="block drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                {event.name.split(" ").slice(0, -2).join(" ") || event.name}
              </span>
              {event.name.split(" ").length > 2 && (
                <span className="block text-[#e9540d] drop-shadow-[0_4px_12px_rgba(233,84,13,0.5)]">
                  {event.name.split(" ").slice(-2).join(" ")}
                </span>
              )}
            </motion.h1>

            {event.event_type === "ultra_backyard" ? (
              <motion.p
                className="text-2xl md:text-3xl lg:text-4xl text-white/95 max-w-3xl mx-auto mb-12 leading-relaxed font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Tu propio Ultra Backyard.
                <br />
                <span className="text-[#e9540d]">Tu reto personal.</span>
                <br />
                <span className="text-xl md:text-2xl">
                  ¿Por cuántas vueltas vas?
                </span>
              </motion.p>
            ) : (
              <motion.p
                className="text-xl md:text-2xl lg:text-3xl text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {event.description
                  ? event.description.split("\n")[0].substring(0, 120) + "..."
                  : "Un desafío que pondrá a prueba tu resistencia y determinación."}
              </motion.p>
            )}

            {/* Loop Stats for Ultra Backyard */}
            {event.event_type === "ultra_backyard" &&
              event.loop_distance &&
              event.loop_elevation &&
              event.loop_duration && (
                <motion.div
                  className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-12 px-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="text-center min-w-[120px]">
                    <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                      {event.loop_distance} KM
                    </p>
                    <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium mt-1">
                      LOOP
                    </p>
                  </div>
                  <div className="text-center min-w-[120px]">
                    <p className="text-3xl sm:text-4xl md:text-5xl font-black text-[#e9540d] drop-shadow-lg">
                      +{event.loop_elevation} MTS
                    </p>
                    <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium mt-1">
                      ELEVACIÓN
                    </p>
                  </div>
                  <div className="text-center min-w-[120px]">
                    <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                      {event.loop_duration} MINS
                    </p>
                    <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium mt-1">
                      DURACIÓN
                    </p>
                  </div>
                </motion.div>
              )}
          </motion.div>
        </div>
      </section>

      {/* Main CTA - Sticky */}
      <div className="sticky top-[73px] z-40 bg-[#e9540d] text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="text-center md:text-left">
              <p className="text-base md:text-lg font-bold">
                ¿Listo para el desafío?
              </p>
              {spotsLeft !== null && spotsLeft > 0 && spotsLeft < 10 && (
                <p className="text-xs md:text-sm text-orange-100">
                  ⚠️ Solo quedan {spotsLeft} lugares disponibles
                </p>
              )}
            </div>
            {!isFull ? (
              <>
                {isRegistered ? (
                  <Badge className="bg-green-500 text-white border-0 px-6 py-2 text-lg">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Ya estás inscrito
                  </Badge>
                ) : (
                  <Button
                    size="lg"
                    className="bg-white text-[#e9540d] hover:bg-orange-50 font-bold px-6 md:px-8 py-5 md:py-6 text-base md:text-lg shadow-lg w-full md:w-auto"
                    onClick={handleRegister}
                    disabled={registering}
                  >
                    {event.external_registration_url ? (
                      <>
                        <ExternalLink className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        <span className="hidden sm:inline">REGISTRARME </span>
                        EXTERNO
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        {registering ? "Registrando..." : "INSCRIBIRME"}
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Badge className="bg-white/20 text-white border-white/30 px-6 py-2 text-lg">
                Evento lleno
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Key Stats - Enhanced with Loop Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          >
            {/* Date Card */}
            <Card className="border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-colors">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 text-[#e9540d] mx-auto mb-3" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {event.start_date && event.end_date ? "Fechas" : "Fecha"}
                </p>
                {event.start_date && event.end_date ? (
                  <>
                    <p className="text-lg font-bold text-foreground">
                      {format(new Date(event.start_date), "d MMM", {
                        locale: es,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">a</p>
                    <p className="text-lg font-bold text-foreground">
                      {format(new Date(event.end_date), "d MMM yyyy", {
                        locale: es,
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-foreground">
                      {format(new Date(event.date), "d MMM", { locale: es })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.date), "yyyy", { locale: es })}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-colors">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-[#e9540d] mx-auto mb-3" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Ubicación
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {event.location || "Por confirmar"}
                </p>
              </CardContent>
            </Card>

            {/* Loop Info Card (if available) or Price Card */}
            {event.loop_distance &&
            event.loop_elevation &&
            event.loop_duration ? (
              <Card className="border-2 border-[#e9540d] bg-gradient-to-br from-[#e9540d]/5 to-orange-50 hover:border-[#e9540d] transition-colors">
                <CardContent className="p-6 text-center">
                  <Mountain className="h-8 w-8 text-[#e9540d] mx-auto mb-3" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Loop
                  </p>
                  <p className="text-2xl font-black text-[#e9540d]">
                    {event.loop_distance} km
                  </p>
                  <p className="text-sm text-muted-foreground">
                    +{event.loop_elevation} mts • {event.loop_duration} mins
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-colors">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-8 w-8 text-[#b07a1e] mx-auto mb-3" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Inversión
                  </p>
                  <p className="text-2xl font-black text-[#e9540d]">
                    {event.price === 0 ? (
                      <span className="text-green-600">Gratis</span>
                    ) : (
                      `$${event.price.toLocaleString()} MXN`
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Capacity Card */}
            <Card className="border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-colors">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-[#e9540d] mx-auto mb-3" />
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Cupo
                </p>
                {event.max_capacity ? (
                  <>
                    <p className="text-2xl font-black text-foreground">
                      {registeredCount} / {event.max_capacity}
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#e9540d] h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            (registeredCount / event.max_capacity) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <p className="text-lg font-bold text-foreground">
                    {registeredCount} inscritos
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Prize Pool Section (if available) */}
          {event.prize_pool && event.prize_pool > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-16"
            >
              <Card className="border-2 border-[#b07a1e] bg-gradient-to-br from-[#b07a1e]/10 via-amber-50 to-yellow-50">
                <CardContent className="p-8 md:p-12 text-center">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Trophy className="h-10 w-10 text-[#b07a1e]" />
                    <h2 className="text-3xl md:text-4xl font-black text-foreground">
                      Bolsa de Premios
                    </h2>
                  </div>
                  <p className="text-5xl md:text-6xl font-black text-[#b07a1e] mb-4">
                    ${event.prize_pool.toLocaleString()} MXN
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Premios en efectivo para los más rápidos
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Multi-Day Program Timeline */}
          {event.start_date && event.end_date && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-16"
            >
              <Card className="border-2 border-[#e9540d]/30 bg-gradient-to-br from-orange-50 to-amber-50">
                <CardContent className="p-8 md:p-12">
                  <div className="flex items-center gap-3 mb-8">
                    <Clock className="h-8 w-8 text-[#e9540d]" />
                    <h2 className="text-3xl md:text-4xl font-black text-foreground">
                      Programa del Evento
                    </h2>
                  </div>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#e9540d]/30 hidden md:block" />

                    <div className="space-y-8">
                      {/* Start Date */}
                      <div className="relative flex gap-6 items-start">
                        <div className="relative z-10 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-[#e9540d] flex items-center justify-center border-4 border-white shadow-lg">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 pt-2">
                          <h3 className="text-xl md:text-2xl font-black text-[#e9540d] mb-2">
                            {format(
                              new Date(event.start_date),
                              "EEEE, d 'de' MMMM",
                              {
                                locale: es,
                              }
                            )}
                          </h3>
                          <p className="text-foreground text-lg">
                            Inicio del evento
                          </p>
                        </div>
                      </div>

                      {/* End Date */}
                      <div className="relative flex gap-6 items-start">
                        <div className="relative z-10 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full bg-[#b07a1e] flex items-center justify-center border-4 border-white shadow-lg">
                            <Trophy className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 pt-2">
                          <h3 className="text-xl md:text-2xl font-black text-[#b07a1e] mb-2">
                            {format(
                              new Date(event.end_date),
                              "EEEE, d 'de' MMMM",
                              {
                                locale: es,
                              }
                            )}
                          </h3>
                          <p className="text-foreground text-lg">
                            Finalización del evento
                          </p>
                        </div>
                      </div>

                      {/* Registration Deadline (if available) */}
                      {event.registration_deadline && (
                        <div className="relative flex gap-6 items-start">
                          <div className="relative z-10 flex-shrink-0">
                            <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center border-4 border-white shadow-lg">
                              <Timer className="h-8 w-8 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 pt-2">
                            <h3 className="text-xl md:text-2xl font-black text-gray-700 mb-2">
                              {format(
                                new Date(event.registration_deadline),
                                "EEEE, d 'de' MMMM",
                                {
                                  locale: es,
                                }
                              )}
                            </h3>
                            <p className="text-foreground text-lg">
                              Fecha límite de inscripción
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Description Sections with Enhanced Styling */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-12 mb-16"
          >
            {descriptionSections.map((section, index) => {
              const isProgram = section.type === "program";
              const isMaterial = section.type === "material";
              const isChallenge = section.type === "challenge";
              const isRules = section.type === "rules";
              const isPrizes = section.type === "prizes";
              const isRegistration = section.type === "registration";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  {isProgram ? (
                    <Card className="border-2 border-[#e9540d]/30 bg-gradient-to-br from-orange-50 to-amber-50">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Clock className="h-8 w-8 text-[#e9540d]" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="space-y-6">
                          {section.content
                            .split("\n")
                            .map((line, lineIndex) => {
                              if (!line.trim()) return null;
                              if (line.match(/^[A-ZÁÉÍÓÚÑ\s]+$/)) {
                                return (
                                  <div key={lineIndex} className="pt-4">
                                    <h3 className="text-xl font-bold text-[#e9540d] mb-2">
                                      {line}
                                    </h3>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={lineIndex}
                                  className="text-foreground leading-relaxed text-lg"
                                >
                                  {line}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isMaterial ? (
                    <Card className="border-2 border-[#b07a1e]/30 bg-gradient-to-br from-amber-50 to-yellow-50">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Target className="h-8 w-8 text-[#b07a1e]" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-4">
                          {section.content
                            .split("\n")
                            .filter((line) => line.trim())
                            .map((line, lineIndex) => {
                              if (
                                line.startsWith("•") ||
                                line.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={lineIndex}
                                    className="flex items-start gap-3 p-3 bg-white/50 rounded-lg"
                                  >
                                    <CheckCircle className="h-5 w-5 text-[#b07a1e] mt-0.5 flex-shrink-0" />
                                    <p className="text-foreground">
                                      {line.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isChallenge ? (
                    <Card className="border-2 border-[#e9540d] bg-gradient-to-br from-[#e9540d]/10 to-red-50">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Flame className="h-8 w-8 text-[#e9540d]" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-lg max-w-none">
                          {section.content
                            .split("\n")
                            .map((paragraph, pIndex) => {
                              if (!paragraph.trim()) return null;

                              if (
                                paragraph.startsWith("•") ||
                                paragraph.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={pIndex}
                                    className="flex items-start gap-3 mb-4 p-4 bg-white/70 rounded-lg"
                                  >
                                    <Zap className="h-5 w-5 text-[#e9540d] mt-1 flex-shrink-0" />
                                    <p className="text-foreground font-medium">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }

                              if (paragraph.includes("**")) {
                                const parts = paragraph.split("**");
                                return (
                                  <p
                                    key={pIndex}
                                    className="mb-4 text-foreground text-lg"
                                  >
                                    {parts.map((part, partIndex) =>
                                      partIndex % 2 === 1 ? (
                                        <strong
                                          key={partIndex}
                                          className="text-[#e9540d] text-xl"
                                        >
                                          {part}
                                        </strong>
                                      ) : (
                                        <span key={partIndex}>{part}</span>
                                      )
                                    )}
                                  </p>
                                );
                              }

                              return (
                                <p
                                  key={pIndex}
                                  className="mb-4 text-foreground leading-relaxed text-lg"
                                >
                                  {paragraph}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isRules ? (
                    <Card className="border-2 border-gray-600/30 bg-gradient-to-br from-gray-50 to-gray-100">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Shield className="h-8 w-8 text-gray-700" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-lg max-w-none">
                          {section.content
                            .split("\n")
                            .map((paragraph, pIndex) => {
                              if (!paragraph.trim()) return null;
                              if (
                                paragraph.startsWith("•") ||
                                paragraph.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={pIndex}
                                    className="flex items-start gap-3 mb-3 p-3 bg-white rounded-lg"
                                  >
                                    <CheckCircle className="h-5 w-5 text-gray-700 mt-1 flex-shrink-0" />
                                    <p className="text-foreground">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-4 text-foreground leading-relaxed"
                                >
                                  {paragraph}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isPrizes ? (
                    <Card className="border-2 border-[#b07a1e]/30 bg-gradient-to-br from-amber-50 to-yellow-50">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Award className="h-8 w-8 text-[#b07a1e]" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-lg max-w-none">
                          {section.content
                            .split("\n")
                            .map((paragraph, pIndex) => {
                              if (!paragraph.trim()) return null;
                              if (
                                paragraph.startsWith("•") ||
                                paragraph.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={pIndex}
                                    className="flex items-start gap-3 mb-3 p-4 bg-white/70 rounded-lg border-l-4 border-[#b07a1e]"
                                  >
                                    <Trophy className="h-5 w-5 text-[#b07a1e] mt-1 flex-shrink-0" />
                                    <p className="text-foreground font-medium">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-4 text-foreground leading-relaxed text-lg"
                                >
                                  {paragraph}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isRegistration ? (
                    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <div className="flex items-center gap-3 mb-8">
                            <Users className="h-8 w-8 text-blue-600" />
                            <h2 className="text-3xl md:text-4xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-lg max-w-none">
                          {section.content
                            .split("\n")
                            .map((paragraph, pIndex) => {
                              if (!paragraph.trim()) return null;
                              if (
                                paragraph.startsWith("•") ||
                                paragraph.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={pIndex}
                                    className="flex items-start gap-3 mb-3 p-3 bg-white/70 rounded-lg"
                                  >
                                    <CheckCircle className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                                    <p className="text-foreground">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-4 text-foreground leading-relaxed"
                                >
                                  {paragraph}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="p-8 md:p-12">
                        {section.title && (
                          <h2 className="text-3xl md:text-4xl font-black mb-8 text-foreground border-b-4 border-[#e9540d] pb-4">
                            {section.title}
                          </h2>
                        )}
                        <div className="prose prose-lg max-w-none">
                          {section.content
                            .split("\n")
                            .map((paragraph, pIndex) => {
                              if (!paragraph.trim()) return null;

                              if (
                                paragraph.startsWith("•") ||
                                paragraph.startsWith("-")
                              ) {
                                return (
                                  <div
                                    key={pIndex}
                                    className="flex items-start gap-3 mb-3"
                                  >
                                    <CheckCircle className="h-5 w-5 text-[#e9540d] mt-1 flex-shrink-0" />
                                    <p className="text-foreground">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }

                              if (paragraph.includes("**")) {
                                const parts = paragraph.split("**");
                                return (
                                  <p
                                    key={pIndex}
                                    className="mb-4 text-foreground"
                                  >
                                    {parts.map((part, partIndex) =>
                                      partIndex % 2 === 1 ? (
                                        <strong
                                          key={partIndex}
                                          className="text-[#e9540d]"
                                        >
                                          {part}
                                        </strong>
                                      ) : (
                                        <span key={partIndex}>{part}</span>
                                      )
                                    )}
                                  </p>
                                );
                              }

                              return (
                                <p
                                  key={pIndex}
                                  className="mb-4 text-foreground leading-relaxed"
                                >
                                  {paragraph}
                                </p>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-12"
          >
            <Card className="bg-gradient-to-r from-[#e9540d] to-[#d14a0b] border-0 shadow-2xl">
              <CardContent className="p-12">
                <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
                  ¿Cuál será tu límite?
                </h3>
                <p className="text-xl text-white/90 mb-8">
                  Únete a la comunidad de corredores que buscan superarse
                </p>
                {!isFull ? (
                  <>
                    {isRegistered ? (
                      <Badge className="bg-green-500 text-white border-0 px-8 py-3 text-lg">
                        <CheckCircle className="h-6 w-6 mr-2" />
                        Ya estás inscrito
                      </Badge>
                    ) : (
                      <Button
                        size="lg"
                        className="bg-white text-[#e9540d] hover:bg-orange-50 font-black px-12 py-6 text-xl shadow-lg"
                        onClick={handleRegister}
                        disabled={registering}
                      >
                        {event.external_registration_url ? (
                          <>
                            <ExternalLink className="h-6 w-6 mr-3" />
                            REGISTRARME EXTERNO
                          </>
                        ) : (
                          <>
                            <Zap className="h-6 w-6 mr-3" />
                            {registering
                              ? "Registrando..."
                              : "INSCRIBIRME AHORA"}
                          </>
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge className="bg-white/20 text-white border-white/30 px-8 py-3 text-lg">
                    Evento lleno - Gracias por tu interés
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              className="border-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </Button>
          </motion.div>
        </div>
      </main>

      {/* Diálogo de registro sin cuenta */}
      <Dialog
        open={isRegistrationDialogOpen}
        onOpenChange={setIsRegistrationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrarse al evento</DialogTitle>
            <DialogDescription>
              Ingresa tu email para registrarte a <strong>{event?.name}</strong>
              .
              {event?.price !== 0 && (
                <>
                  <br />
                  Precio: <strong>${event?.price.toLocaleString()} MXN</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {registrationError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {registrationError}
            </div>
          )}
          {registrationSuccess ? (
            <div className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">¡Registro exitoso!</h3>
              <p className="text-muted-foreground mb-4">
                Te hemos enviado un correo de confirmación a{" "}
                <strong>{registrationEmail}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Si creas una cuenta más tarde con este mismo email, podrás ver
                este evento en tu dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={registrationEmail}
                  onChange={(e) => setRegistrationEmail(e.target.value)}
                  disabled={registering}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Al registrarte, recibirás un correo de confirmación. Si luego
                creas una cuenta con este mismo email, podrás ver el evento en
                tu dashboard.
              </p>
            </div>
          )}
          <DialogFooter>
            {registrationSuccess ? (
              <Button
                onClick={() => {
                  setIsRegistrationDialogOpen(false);
                  setRegistrationEmail("");
                  setRegistrationSuccess(false);
                  setRegistrationError("");
                }}
              >
                Cerrar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRegistrationDialogOpen(false);
                    setRegistrationEmail("");
                    setRegistrationError("");
                  }}
                  disabled={registering}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleRegisterWithEmail}
                  disabled={registering || !registrationEmail}
                >
                  {registering ? "Registrando..." : "Registrarse"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

