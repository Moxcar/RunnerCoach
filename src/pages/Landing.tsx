import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="RunnerCoach" className="h-10" />
          </Link>
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
          <div className="flex items-center gap-3">
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
        </div>
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

            {/* Runner silhouette - in action, climbing */}
            <motion.div
              className="absolute bottom-[18%] right-[8%] z-20 hidden lg:block"
              initial={{ opacity: 0, x: 50, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <svg
                width="180"
                height="280"
                viewBox="0 0 180 280"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Runner body - dynamic running pose */}
                <g opacity="0.4">
                  {/* Head */}
                  <circle
                    cx="90"
                    cy="60"
                    r="14"
                    fill="rgba(233, 84, 13, 0.4)"
                    stroke="rgba(233, 84, 13, 0.6)"
                    strokeWidth="2"
                  />

                  {/* Torso */}
                  <path
                    d="M90,74 L90,140"
                    stroke="rgba(233, 84, 13, 0.5)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Arms - running motion */}
                  <path
                    d="M90,90 L70,110 M90,90 L110,100"
                    stroke="rgba(233, 84, 13, 0.5)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Legs - mid-stride */}
                  <path
                    d="M90,140 L75,200 M90,140 L105,195 M90,140 L80,240 M90,140 L100,235"
                    stroke="rgba(233, 84, 13, 0.5)"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Motion trail effect */}
                  <path
                    d="M110,100 Q120,110 130,120"
                    stroke="rgba(233, 84, 13, 0.2)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </g>
              </svg>
            </motion.div>

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
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Badge className="mb-8 bg-primary/30 text-primary border-primary/40 px-5 py-2 text-sm font-bold inline-flex items-center gap-2 backdrop-blur-sm">
                <Flame className="h-4 w-4" />
                SUDOR. ESFUERZO. PASIÓN.
              </Badge>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white leading-[0.9] mb-8 tracking-tighter"
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
              className="text-xl md:text-2xl lg:text-3xl text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Cada cima que conquistas, cada kilómetro que dueles,
              <br />
              <span className="text-primary">
                un coach te guía hacia tu mejor versión.
              </span>
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white text-lg px-12 py-7 shadow-2xl shadow-primary/40 group font-bold uppercase tracking-wide"
                >
                  Encontrar mi coach
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#benefits">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/20 backdrop-blur-md border-2 border-white/60 text-white hover:bg-white/30 hover:border-white/80 text-lg px-10 py-7 font-bold shadow-lg"
                >
                  Ver cómo funciona
                </Button>
              </a>
            </motion.div>

            {/* Stats overlay - showing passion/effort */}
            <motion.div
              className="mt-16 flex flex-wrap justify-center gap-8 md:gap-12 items-baseline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[
                { value: "2,500+", label: "Runners entrenando" },
                { value: "150+", label: "Coaches expertos" },
                { value: "∞", label: "Pasión", symbol: true },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-black text-white drop-shadow-lg leading-none flex items-center justify-center h-[3rem] md:h-[4rem]">
                    {stat.symbol ? (
                      <span className="text-3xl md:text-4xl">∞</span>
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-sm md:text-base text-white/70 font-medium mt-1">
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
        <section id="benefits" className="py-24 md:py-32 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-20"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6">
                RESULTADOS QUE <span className="text-primary">IMPORTAN</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                No hablamos de funciones. Hablamos de lo que realmente quieres
                lograr.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8"
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
                    <div className="bg-gray-50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-secondary/5 rounded-3xl p-8 h-full border border-gray-100 hover:border-primary/20 transition-all duration-300">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {benefit.description}
                      </p>

                      <div className="pt-6 border-t border-gray-200">
                        <p className="text-4xl font-black text-primary">
                          {benefit.stat}
                        </p>
                        <p className="text-sm text-gray-500 font-medium">
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
          className="py-24 md:py-32 px-6 bg-gray-900 relative overflow-hidden"
        >
          {/* Background accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              className="mb-16"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <Badge className="mb-6 bg-secondary/20 text-secondary border-secondary/30 px-4 py-1.5">
                <Trophy className="h-4 w-4 mr-2" />
                Historias de éxito
              </Badge>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                RUNNERS COMO TÚ
                <br />
                <span className="text-secondary">ALCANZANDO METAS</span>
              </h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6"
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
                  <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-2xl p-6 h-full hover:border-secondary/30 transition-colors">
                    <Quote className="h-8 w-8 text-secondary/50 mb-4" />
                    <p className="text-gray-300 mb-6 leading-relaxed italic">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                      <div>
                        <p className="font-bold text-white">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {testimonial.role}
                        </p>
                      </div>
                      <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-xs">
                        {testimonial.achievement}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats bar */}
            <motion.div
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-gray-800"
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
                  <p className="text-3xl md:text-4xl font-black text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS - Asymmetric Layout */}
        <section className="py-24 md:py-32 px-6 bg-white">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="grid lg:grid-cols-2 gap-16 items-center"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={stagger}
            >
              {/* Text content - offset */}
              <motion.div variants={fadeUp}>
                <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
                  Simple y efectivo
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                  DE PRINCIPIANTE
                  <br />A <span className="text-primary">FINISHER</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  No importa tu nivel actual. Nuestros coaches diseñan un plan
                  personalizado para llevarte exactamente donde quieres llegar.
                </p>

                <div className="space-y-6">
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
                    <div key={item.step} className="flex gap-4 items-start">
                      <span className="text-5xl font-black text-primary/20">
                        {item.step}
                      </span>
                      <div className="pt-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {item.title}
                        </h4>
                        <p className="text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link to="/register" className="inline-block mt-10">
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
                                ${plan.cost.toFixed(0)} MXN
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
                  className="max-w-5xl mx-auto"
                >
                  {events.map((event) => (
                    <Link key={event.id} to={`/events/${event.id}`}>
                      <div className="group relative bg-gradient-to-br from-[#e9540d]/10 via-orange-50 to-amber-50 rounded-3xl overflow-hidden border-2 border-[#e9540d]/20 hover:border-[#e9540d] transition-all duration-500 shadow-xl hover:shadow-2xl">
                        <div className="grid md:grid-cols-2 gap-0">
                          {/* Image Section */}
                          <div className="relative h-80 md:h-auto md:min-h-[500px] overflow-hidden bg-gray-900">
                            {event.image_url ? (
                              <>
                                <img
                                  src={event.image_url}
                                  alt={event.name}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                  onError={(e) => {
                                    // Si la imagen falla, mostrar el placeholder
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const placeholder =
                                      target.parentElement?.querySelector(
                                        ".image-placeholder"
                                      ) as HTMLElement;
                                    if (placeholder)
                                      placeholder.style.display = "flex";
                                  }}
                                />
                                <div className="image-placeholder absolute inset-0 w-full h-full bg-gradient-to-br from-[#e9540d] via-[#d14a0b] to-[#b07a1e] flex items-center justify-center hidden">
                                  <Mountain className="h-32 w-32 text-white/20" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent md:from-black/30" />
                              </>
                            ) : (
                              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#e9540d] via-[#d14a0b] to-[#b07a1e] flex items-center justify-center">
                                <Mountain className="h-32 w-32 text-white/20" />
                              </div>
                            )}
                            {/* Badge on Image */}
                            <div className="absolute top-6 left-6 z-10">
                              <Badge className="bg-[#e9540d] text-white border-0 px-4 py-2 text-sm font-bold shadow-lg">
                                <Flame className="h-4 w-4 mr-2" />
                                Evento Destacado
                              </Badge>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-8 md:p-12 flex flex-col justify-between bg-white/80 backdrop-blur-sm">
                            <div>
                              <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
                                {event.name}
                              </h3>

                              <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-gray-700">
                                  <div className="p-2 bg-[#e9540d]/10 rounded-lg">
                                    <Calendar className="h-5 w-5 text-[#e9540d]" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Fecha
                                    </p>
                                    <p className="font-bold text-lg">
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
                                  <div className="flex items-center gap-3 text-gray-700">
                                    <div className="p-2 bg-[#e9540d]/10 rounded-lg">
                                      <MapPin className="h-5 w-5 text-[#e9540d]" />
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-500">
                                        Ubicación
                                      </p>
                                      <p className="font-semibold">
                                        {event.location}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-gray-700">
                                  <div className="p-2 bg-[#b07a1e]/10 rounded-lg">
                                    <Trophy className="h-5 w-5 text-[#b07a1e]" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Inversión
                                    </p>
                                    <p
                                      className={`text-2xl font-black ${
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
                              className="w-full bg-[#e9540d] hover:bg-[#d14a0b] text-white font-bold py-6 text-lg shadow-lg group-hover:shadow-xl transition-all"
                              onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                navigate(`/events/${event.id}`);
                              }}
                            >
                              Ver Detalles Completos
                              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
                        <Link to={`/events/${event.id}`}>
                          <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer">
                            {event.image_url ? (
                              <div className="relative h-52 overflow-hidden">
                                <img
                                  src={event.image_url}
                                  alt={event.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    // Si la imagen falla, mostrar el placeholder
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const placeholder =
                                      target.parentElement?.querySelector(
                                        ".image-placeholder"
                                      ) as HTMLElement;
                                    if (placeholder)
                                      placeholder.style.display = "flex";
                                  }}
                                />
                                <div className="image-placeholder h-52 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center hidden">
                                  <Mountain className="h-16 w-16 text-primary/20" />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4">
                                  <p className="text-white font-bold text-lg">
                                    {event.name}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-52 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                                <Mountain className="h-16 w-16 text-primary/20" />
                                <div className="absolute bottom-4 left-4">
                                  <p className="text-gray-900 font-bold text-lg">
                                    {event.name}
                                  </p>
                                </div>
                              </div>
                            )}

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
                                    navigate(`/events/${event.id}`);
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
      <footer className="bg-black text-white py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <img src={logoBlanco} alt="RunnerCoach" className="h-10 mb-4" />
              <p className="text-gray-500 text-sm leading-relaxed">
                Conectamos runners apasionados con coaches profesionales. Tu
                viaje hacia tus metas comienza aquí.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-gray-300">Para Runners</h4>
              <ul className="space-y-2 text-sm text-gray-500">
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
              <h4 className="font-bold mb-4 text-gray-300">Compañía</h4>
              <ul className="space-y-2 text-sm text-gray-500">
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
              <h4 className="font-bold mb-4 text-gray-300">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
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
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-sm text-gray-600">
              Hecho de runners para runners
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
