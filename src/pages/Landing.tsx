import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Calendar,
  MapPin,
  ArrowRight,
  Clock,
  Trophy,
  Target,
  Timer,
  Shield,
  Flame,
  Mountain,
  Star,
  Quote,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getEventUrl } from "@/lib/utils";
import logo from "/logo.svg";
import logoBlanco from "/logoBlanco.svg";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  slug?: string | null;
}

interface Plan {
  id: string;
  name: string;
  cost: number;
  features: string[];
  is_active: boolean;
}

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    loadEvents();
    loadPlans();
  }, []);

  useEffect(() => {
    console.log("Events state changed:", events);
    console.log("Events array length:", events?.length);
  }, [events]);

  const loadEvents = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      console.log("Loading events for date >= ", todayStr);

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("date", todayStr)
        .order("date", { ascending: true })
        .limit(3);

      if (error) {
        console.error("Error loading events:", error);
        setEvents([]);
        return;
      }

      console.log("Raw data from Supabase:", data);
      console.log("Data type:", typeof data);
      console.log("Is array?", Array.isArray(data));
      console.log("Data length:", data?.length);

      if (data && Array.isArray(data) && data.length > 0) {
        console.log("Setting events:", data);
        setEvents(data as Event[]);
      } else {
        console.log("No events found or empty array");
        setEvents([]);
      }
    } catch (error) {
      console.error("Error loading events:", error);
      setEvents([]);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (error) throw error;
      if (data) setPlans(data as Plan[]);
    } catch (error) {
      console.error("Error loading plans:", error);
    }
  };

  const benefits = [
    {
      icon: Timer,
      title: "Mejora tus tiempos",
      description:
        "Entrenamientos personalizados que te llevan a romper tus marcas personales.",
      stat: "-12 min",
      statLabel: "promedio en maratón",
    },
    {
      icon: Shield,
      title: "Prevén lesiones",
      description:
        "Técnicas y progresión adecuada para que corras más y te lesiones menos.",
      stat: "85%",
      statLabel: "menos lesiones",
    },
    {
      icon: Target,
      title: "Alcanza tus metas",
      description:
        "Desde tu primer 5K hasta tu primera ultra, un coach te guía en cada paso.",
      stat: "2,500+",
      statLabel: "metas alcanzadas",
    },
  ];

  const testimonials = [
    {
      name: "María García",
      role: "Maratonista",
      quote:
        "En 6 meses bajé 18 minutos mi tiempo en maratón. Mi coach entendió exactamente lo que necesitaba.",
      achievement: "Sub 3:30 Maratón",
    },
    {
      name: "Carlos Ruiz",
      role: "Trail Runner",
      quote:
        "Pasé de no poder correr 10km a completar mi primer ultra de 50km. Increíble transformación.",
      achievement: "Ultra Trail 50K",
    },
    {
      name: "Ana Martínez",
      role: "Running Principiante",
      quote:
        "Nunca pensé que podría amar correr. Mi coach me enseñó a disfrutar cada kilómetro.",
      achievement: "Primera Media Maratón",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="RunnerCoach" className="h-8 sm:h-10" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a
              href="#benefits"
              className="hover:text-primary transition-colors duration-150"
            >
              Beneficios
            </a>
            <a
              href="#coaches"
              className="hover:text-primary transition-colors duration-150"
            >
              Coaches
            </a>
            <a
              href="#events"
              className="hover:text-primary transition-colors duration-150"
            >
              Eventos
            </a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button
                variant="ghost"
                className="text-gray-700 hover:text-primary"
              >
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Encontrar Coach
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                <div className="flex flex-col space-y-3">
                  <a
                    href="#benefits"
                    className="text-gray-700 hover:text-primary font-medium py-2 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Beneficios
                  </a>
                  <a
                    href="#coaches"
                    className="text-gray-700 hover:text-primary font-medium py-2 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Coaches
                  </a>
                  <a
                    href="#events"
                    className="text-gray-700 hover:text-primary font-medium py-2 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Eventos
                  </a>
                </div>
                <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Entrar
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                      Encontrar Coach
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        {/* HERO - Full Screen Immersive with Mountains */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        >
          {/* Background - Sky gradient from dawn to day */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-900/40 via-amber-900/30 to-gray-900">
            {/* Sun/light source */}
            <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />

            {/* Minimalist Mountains - Multiple layers for depth */}
            <svg
              className="absolute bottom-0 left-0 right-0 w-full h-[70vh] min-h-[600px]"
              viewBox="0 0 1440 600"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Far mountains - subtle, distant */}
              <path
                d="M0,450 L180,380 L360,400 L540,350 L720,380 L900,360 L1080,370 L1260,350 L1440,365 L1440,600 L0,600 Z"
                fill="url(#mountainFar)"
                className="opacity-30"
              />

              {/* Mid mountains */}
              <path
                d="M0,500 L200,420 L400,450 L600,400 L800,430 L1000,410 L1200,440 L1440,460 L1440,600 L0,600 Z"
                fill="url(#mountainMid)"
                className="opacity-50"
              />

              {/* Near mountains - bold, prominent */}
              <path
                d="M0,550 L150,480 L350,510 L550,460 L750,490 L950,470 L1150,500 L1440,520 L1440,600 L0,600 Z"
                fill="url(#mountainNear)"
                className="opacity-70"
              />

              {/* Closest mountain peaks - most defined */}
              <path
                d="M0,580 L100,520 L300,550 L500,500 L700,530 L900,510 L1100,540 L1440,560 L1440,600 L0,600 Z"
                fill="url(#mountainClosest)"
                className="opacity-90"
              />

              <defs>
                <linearGradient
                  id="mountainFar"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0a0a0a" stopOpacity="1" />
                </linearGradient>
                <linearGradient
                  id="mountainMid"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2a2a2a" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1a1a1a" stopOpacity="1" />
                </linearGradient>
                <linearGradient
                  id="mountainNear"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#3a3a3a" stopOpacity="1" />
                  <stop offset="100%" stopColor="#2a2a2a" stopOpacity="1" />
                </linearGradient>
                <linearGradient
                  id="mountainClosest"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#4a4a4a" stopOpacity="1" />
                  <stop offset="100%" stopColor="#3a3a3a" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>

            {/* Motion lines - suggesting speed, effort, wind */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-full w-0.5 bg-gradient-to-b from-transparent via-primary/20 to-transparent"
                  style={{
                    left: `${15 + i * 12}%`,
                    top: 0,
                  }}
                  animate={{
                    y: [0, -150, 0],
                    opacity: [0, 0.4, 0],
                    scaleX: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 1.5 + i * 0.2,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}

              {/* Horizontal speed lines */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`h-${i}`}
                  className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
                  style={{
                    top: `${40 + i * 20}%`,
                    left: 0,
                  }}
                  animate={{
                    x: ["-100%", "200%"],
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{
                    duration: 2 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.8,
                    ease: "linear",
                  }}
                />
              ))}
            </div>
          </div>

          <motion.div
            className="relative z-30 container mx-auto px-6 text-center"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.9] mb-6 sm:mb-8 tracking-tighter"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span className="block drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                CORRE.
              </span>
              <span className="block text-primary drop-shadow-[0_4px_12px_rgba(233,84,13,0.5)]">
                SUBE.
              </span>
              <span className="block bg-gradient-to-r from-secondary via-yellow-500 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(176,122,30,0.3)]">
                VENCE.
              </span>
            </motion.h1>

            <motion.p
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Cada cima que conquistas, cada kilómetro que dueles,
              <br className="hidden sm:block" />
              <span className="text-primary">
                un coach te guía hacia tu mejor versión.
              </span>
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 shadow-2xl shadow-primary/40 group font-bold uppercase tracking-wide"
                >
                  Encontrar mi coach
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#benefits" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/20 backdrop-blur-md border-2 border-white/60 text-white hover:bg-white/30 hover:border-white/80 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 font-bold shadow-lg"
                >
                  Ver cómo funciona
                </Button>
              </a>
            </motion.div>

            {/* Stats overlay - showing passion/effort */}
            <motion.div
              className="mt-10 sm:mt-16 flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12 items-baseline px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[
                { value: "2,500+", label: "Runners entrenando" },
                { value: "150+", label: "Coaches expertos" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-none flex items-center justify-center h-[2.5rem] sm:h-[3rem] md:h-[4rem]">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="h-8 w-8 text-white/60 drop-shadow-lg" />
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* BENEFITS - Results Focused */}
        <section
          id="benefits"
          className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-white"
        >
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-12 sm:mb-20"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 sm:mb-6 px-2">
                RESULTADOS QUE <span className="text-primary">IMPORTAN</span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
                No hablamos de funciones. Hablamos de lo que realmente quieres
                lograr.
              </p>
            </motion.div>

            <motion.div
              className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
            >
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    className="group"
                    variants={fadeUp}
                  >
                    <div className="bg-gray-50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-secondary/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8 h-full border border-gray-100 hover:border-primary/20 transition-all duration-300">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                        {benefit.description}
                      </p>

                      <div className="pt-4 sm:pt-6 border-t border-gray-200">
                        <p className="text-3xl sm:text-4xl font-black text-primary">
                          {benefit.stat}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">
                          {benefit.statLabel}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* SOCIAL PROOF - Dark Immersive Section */}
        <section
          id="coaches"
          className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-gray-900 relative overflow-hidden"
        >
          {/* Background accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute bottom-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              className="mb-10 sm:mb-16"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Badge className="mb-4 sm:mb-6 bg-secondary/20 text-secondary border-secondary/30 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Historias de éxito
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 sm:mb-6">
                RUNNERS COMO TÚ
                <br />
                <span className="text-secondary">ALCANZANDO METAS</span>
              </h2>
            </motion.div>

            <motion.div
              className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  className="relative"
                  variants={fadeUp}
                >
                  <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 h-full hover:border-secondary/30 transition-colors">
                    <Quote className="h-6 w-6 sm:h-8 sm:w-8 text-secondary/50 mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-700/50">
                      <div>
                        <p className="font-bold text-white text-sm sm:text-base">
                          {testimonial.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {testimonial.role}
                        </p>
                      </div>
                      <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-xs w-fit">
                        {testimonial.achievement}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats bar */}
            <motion.div
              className="mt-10 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 pt-10 sm:pt-16 border-t border-gray-800"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
            >
              {[
                { value: "150+", label: "Coaches certificados" },
                { value: "2,500+", label: "Runners activos" },
                { value: "98%", label: "Satisfacción" },
                { value: "500+", label: "Eventos" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  variants={fadeUp}
                >
                  <p className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS - Asymmetric Layout */}
        <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Text content - offset */}
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 sm:mb-6 bg-primary/10 text-primary border-primary/20 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm">
                  Simple y efectivo
                </Badge>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4 sm:mb-6 leading-tight">
                  DE PRINCIPIANTE
                  <br />A <span className="text-primary">FINISHER</span>
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                  No importa tu nivel actual. Nuestros coaches diseñan un plan
                  personalizado para llevarte exactamente donde quieres llegar.
                </p>

                <div className="space-y-4 sm:space-y-6">
                  {[
                    {
                      step: "01",
                      title: "Cuéntanos tu meta",
                      desc: "¿5K? ¿Maratón? ¿Trail?",
                    },
                    {
                      step: "02",
                      title: "Conecta con tu coach",
                      desc: "Te asignamos el ideal para ti",
                    },
                    {
                      step: "03",
                      title: "Entrena y mejora",
                      desc: "Seguimiento personalizado",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-3 sm:gap-4 items-start"
                    >
                      <span className="text-3xl sm:text-4xl md:text-5xl font-black text-primary/20">
                        {item.step}
                      </span>
                      <div className="pt-1 sm:pt-2">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900">
                          {item.title}
                        </h4>
                        <p className="text-sm sm:text-base text-gray-600">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link to="/register" className="inline-block mt-8 sm:mt-10">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white group"
                  >
                    Empezar ahora
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </motion.div>

              {/* Visual element - offset card stack */}
              <motion.div className="relative" variants={fadeUp}>
                <div className="relative">
                  {/* Background card */}
                  <div className="absolute top-8 -left-4 right-4 bottom-0 bg-secondary/10 rounded-3xl" />

                  {/* Main card */}
                  <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Mountain className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">Plan Trail Running</p>
                        <p className="text-sm text-gray-400">12 semanas</p>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progreso</span>
                        <span className="text-primary font-bold">
                          Semana 8/12
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-primary to-secondary rounded-full" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-700">
                      <div className="text-center">
                        <p className="text-2xl font-bold">124</p>
                        <p className="text-xs text-gray-500">km este mes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">
                          +15%
                        </p>
                        <p className="text-xs text-gray-500">mejora ritmo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">0</p>
                        <p className="text-xs text-gray-500">lesiones</p>
                      </div>
                    </div>
                  </div>

                  {/* Floating notification */}
                  <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-2xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          ¡Nueva marca personal!
                        </p>
                        <p className="text-xs text-gray-500">10K en 48:32</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* PLANS Section */}
        {plans.length > 0 && (
          <section id="plans" className="py-24 md:py-32 px-6 bg-gray-50">
            <div className="container mx-auto max-w-6xl">
              <motion.div
                className="text-center mb-16"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                  ELIGE TU <span className="text-primary">NIVEL</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-xl mx-auto">
                  Planes diseñados para cada etapa de tu viaje como runner
                </p>
              </motion.div>

              <motion.div
                className={`grid gap-6 items-stretch ${
                  plans.length === 2
                    ? "md:grid-cols-2 max-w-4xl mx-auto"
                    : "md:grid-cols-3"
                }`}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={stagger}
              >
                {plans.map((plan, index) => {
                  const isPopular = index === Math.floor(plans.length / 2);
                  return (
                    <motion.div
                      key={plan.id}
                      className="relative flex"
                      variants={fadeUp}
                    >
                      <div
                        className={`bg-white rounded-2xl border w-full flex flex-col transition-all duration-200 hover:shadow-xl ${
                          isPopular
                            ? "border-primary shadow-lg"
                            : "border-gray-200 hover:border-primary/30"
                        }`}
                      >
                        <div className="p-8 flex flex-col flex-1">
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                              {plan.name}
                            </h3>
                            <div className="flex items-baseline gap-1 mb-6">
                              <span
                                className={`text-5xl font-black ${
                                  isPopular ? "text-primary" : "text-gray-900"
                                }`}
                              >
                                ${plan.cost.toFixed(2)} MXN
                              </span>
                              <span className="text-gray-500">/mes</span>
                            </div>

                            <ul className="space-y-4 mb-8">
                              {plan.features.map((feature, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-3 text-sm"
                                >
                                  <CheckCircle
                                    className={`h-5 w-5 flex-shrink-0 ${
                                      isPopular
                                        ? "text-primary"
                                        : "text-green-500"
                                    }`}
                                  />
                                  <span className="text-gray-600">
                                    {feature}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mt-auto">
                            <Link to="/register">
                              <Button
                                className={`w-full ${
                                  isPopular
                                    ? "bg-primary hover:bg-primary/90 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                }`}
                                size="lg"
                              >
                                {isPopular ? "Empezar ahora" : "Elegir plan"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </section>
        )}

        {/* EVENTS Section */}
        <section id="events" className="py-24 md:py-32 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="flex flex-col md:flex-row md:items-end justify-between mb-12"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
                  <Calendar className="h-4 w-4 mr-2" />
                  Próximas carreras
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900">
                  CORRE CON LA <span className="text-primary">COMUNIDAD</span>
                </h2>
              </div>
              <Link to="/register" className="mt-6 md:mt-0">
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  Ver todos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            {events && Array.isArray(events) && events.length > 0 ? (
              events.length === 1 ? (
                // Single Event - Large Featured Design
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-5xl mx-auto px-4 sm:px-0"
                >
                  {events.map((event) => (
                    <Link key={event.id} to={getEventUrl(event)}>
                      <div className="group relative bg-gradient-to-br from-[#e9540d]/10 via-orange-50 to-amber-50 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-all duration-500 shadow-xl hover:shadow-2xl">
                        <div className="grid md:grid-cols-2 gap-0">
                          {/* Image Section */}
                          <div className="relative h-64 sm:h-80 md:h-auto md:min-h-[500px] overflow-hidden bg-gray-900">
                            {/* Background Image: event image or gradient background */}
                            {event.image_url ? (
                              <img
                                src={event.image_url}
                                alt={event.name}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 z-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div
                                className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
                                style={{
                                  backgroundImage: `url('/event-background-gradient.png')`,
                                }}
                              />
                            )}

                            {/* Logo SVG: ubyprotrail.svg centered */}
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <img
                                src="/ubyprotrail.svg"
                                alt="UBYPROTRAIL"
                                className="w-2/3 sm:w-3/4 max-w-[200px] sm:max-w-md h-auto opacity-90"
                              />
                            </div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent md:from-black/30 z-20" />
                            {/* Badge on Image */}
                            <div className="absolute top-3 left-3 sm:top-6 sm:left-6 z-30">
                              <Badge className="bg-[#e9540d] text-white border-0 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold shadow-lg">
                                <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">
                                  Evento Destacado
                                </span>
                                <span className="sm:hidden">Destacado</span>
                              </Badge>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-between bg-white/80 backdrop-blur-sm">
                            <div>
                              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-3 sm:mb-4 leading-tight break-words">
                                {event.name}
                              </h3>

                              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                                <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                                  <div className="p-1.5 sm:p-2 bg-[#e9540d]/10 rounded-lg flex-shrink-0">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#e9540d]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm text-gray-500">
                                      Fecha
                                    </p>
                                    <p className="font-bold text-sm sm:text-base md:text-lg break-words">
                                      {format(
                                        new Date(event.date),
                                        "EEEE, d 'de' MMMM",
                                        {
                                          locale: es,
                                        }
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {event.location && (
                                  <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                                    <div className="p-1.5 sm:p-2 bg-[#e9540d]/10 rounded-lg flex-shrink-0">
                                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#e9540d]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs sm:text-sm text-gray-500">
                                        Ubicación
                                      </p>
                                      <p className="font-semibold text-sm sm:text-base break-words">
                                        {event.location}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 sm:gap-3 text-gray-700">
                                  <div className="p-1.5 sm:p-2 bg-[#b07a1e]/10 rounded-lg flex-shrink-0">
                                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-[#b07a1e]" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm text-gray-500">
                                      Inversión
                                    </p>
                                    <p
                                      className={`text-lg sm:text-xl md:text-2xl font-black ${
                                        event.price === 0
                                          ? "text-green-600"
                                          : "text-[#e9540d]"
                                      }`}
                                    >
                                      {event.price === 0
                                        ? "Gratis"
                                        : `$${event.price.toLocaleString()} MXN`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Button
                              size="lg"
                              className="w-full bg-[#e9540d] hover:bg-[#d14a0b] text-white font-bold py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg shadow-lg group-hover:shadow-xl transition-all"
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                navigate(getEventUrl(event));
                              }}
                            >
                              <span className="hidden sm:inline">
                                Ver Detalles Completos
                              </span>
                              <span className="sm:hidden">Ver Detalles</span>
                              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </motion.div>
              ) : (
                // Multiple Events - Grid Layout
                <motion.div
                  className={`grid gap-6 ${
                    events.length === 2
                      ? "md:grid-cols-2 max-w-4xl mx-auto"
                      : "md:grid-cols-3"
                  }`}
                  initial="initial"
                  animate="animate"
                  variants={stagger}
                >
                  {events.map((event) => {
                    console.log("Rendering event:", event.id, event.name);
                    return (
                      <motion.div
                        key={event.id}
                        className="group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <Link to={getEventUrl(event)}>
                          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer">
                            <div className="relative h-52 overflow-hidden">
                              {/* Background Image: event image or gradient background */}
                              {event.image_url ? (
                                <img
                                  src={event.image_url}
                                  alt={event.name}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  className="absolute inset-0 w-full h-full bg-cover bg-center z-0"
                                  style={{
                                    backgroundImage: `url('/event-background-gradient.png')`,
                                  }}
                                />
                              )}

                              {/* Logo SVG: ubyprotrail.svg centered */}
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <img
                                  src="/ubyprotrail.svg"
                                  alt="UBYPROTRAIL"
                                  className="w-2/3 max-w-xs h-auto opacity-90"
                                />
                              </div>

                              {/* Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-20" />
                              <div className="absolute bottom-4 left-4 right-4 z-30">
                                <p className="text-white font-bold text-lg">
                                  {event.name}
                                </p>
                              </div>
                            </div>

                            <div className="p-5">
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>
                                    {format(new Date(event.date), "dd MMM", {
                                      locale: es,
                                    })}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span className="truncate max-w-[120px]">
                                      {event.location}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <span
                                  className={`text-xl font-bold ${
                                    event.price === 0
                                      ? "text-green-600"
                                      : "text-secondary"
                                  }`}
                                >
                                  {event.price === 0
                                    ? "Gratis"
                                    : `$${event.price.toLocaleString()} MXN`}
                                </span>
                                <Button
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-white"
                                  onClick={(e: React.MouseEvent) => {
                                    e.preventDefault();
                                    navigate(getEventUrl(event));
                                  }}
                                >
                                  Ver detalles
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )
            ) : (
              <motion.div
                className="text-center py-16"
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Mountain className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-3">
                  Próximamente más eventos
                </h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Estamos preparando las mejores carreras y eventos para la
                  comunidad. Regístrate para ser el primero en enterarte.
                </p>
                <Link to="/register">
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Regístrate ahora
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </section>

        {/* FINAL CTA - Immersive */}
        <section className="py-24 md:py-32 px-6 bg-gray-900 relative overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          </div>

          <motion.div
            className="container mx-auto max-w-4xl relative z-10 text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              TU MEJOR VERSIÓN
              <br />
              <span className="text-primary">TE ESTÁ ESPERANDO</span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Cada kilómetro cuenta. Cada entrenamiento te acerca a tu meta. Un
              coach profesional puede ser la diferencia entre intentar y lograr.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white text-lg px-10 py-6 shadow-2xl shadow-primary/30 group"
                >
                  Encontrar mi coach
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 backdrop-blur-md border-2 border-white/60 text-white hover:bg-white/30 hover:border-white/80 text-lg font-bold shadow-lg"
                >
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-10 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
            <div className="col-span-2 sm:col-span-2 md:col-span-1">
              <img
                src={logoBlanco}
                alt="RunnerCoach"
                className="h-8 sm:h-10 mb-3 sm:mb-4"
              />
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                Conectamos runners apasionados con coaches profesionales. Tu
                viaje hacia tus metas comienza aquí.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-gray-300 text-sm sm:text-base">
                Para Runners
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li>
                  <a
                    href="#benefits"
                    className="hover:text-primary transition-colors"
                  >
                    Beneficios
                  </a>
                </li>
                <li>
                  <a
                    href="#plans"
                    className="hover:text-primary transition-colors"
                  >
                    Planes
                  </a>
                </li>
                <li>
                  <a
                    href="#events"
                    className="hover:text-primary transition-colors"
                  >
                    Eventos
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-gray-300 text-sm sm:text-base">
                Compañía
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Sobre nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-gray-300 text-sm sm:text-base">
                Legal
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-500">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Términos
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-6 sm:pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-xs sm:text-sm text-gray-600 text-center">
              Hecho de runners para runners
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
