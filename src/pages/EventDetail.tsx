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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, FileText } from "lucide-react";
import stripePromise from "@/lib/stripe";

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
  slug?: string | null;
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
  // Ultra Backyard specific content
  ultra_backyard_intro?: string | null;
  ultra_backyard_description?: string | null;
  ultra_backyard_conclusion?: string | null;
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "manual">(
    "stripe"
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [processingStripe, setProcessingStripe] = useState(false);
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

  // Helper function to check if a string is a UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const loadEvent = async () => {
    if (!id) return;

    try {
      let query = supabase.from("events").select("*");

      // Si el parámetro es un UUID, buscar por ID, si no, buscar por slug
      if (isUUID(id)) {
        query = query.eq("id", id);
      } else {
        query = query.eq("slug", id);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setEvent(data as Event);
        const eventId = data.id;

        // Contar inscripciones
        const { count, error: countError } = await supabase
          .from("event_registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId);

        if (countError) {
          console.error("Error counting registrations:", countError);
          // Si hay error, intentar con una consulta alternativa
          const { data: registrationsData } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", eventId);
          setRegisteredCount(registrationsData?.length || 0);
        } else {
          setRegisteredCount(count || 0);
        }

        // Verificar si el usuario actual está registrado
        if (user) {
          const { data: registration } = await supabase
            .from("event_registrations")
            .select("id")
            .eq("event_id", eventId)
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
      // Si el evento tiene precio, abrir diálogo de pago primero
      if (event && event.price > 0) {
        setIsPaymentDialogOpen(true);
        return;
      }
      // Si es gratis, abrir diálogo de registro sin cuenta
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

  const sendConfirmationEmail = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-event-confirmation-email",
        {
          body: {
            email,
            eventName: event?.name,
            eventDate: event?.date || event?.start_date,
            eventLocation: event?.location,
            eventPrice: event?.price,
          },
        }
      );

      if (error) {
        console.error("Error sending email:", error);
        // No fallar el registro si el correo falla
      }
    } catch (err) {
      console.error("Error calling email function:", err);
      // No fallar el registro si el correo falla
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const uploadReceipt = async (file: File, email: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    // Sanitizar email para usar en nombre de archivo (reemplazar caracteres especiales)
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9._%+-@]/g, "_");
    const fileName = `${sanitizedEmail}-${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) {
      // Si el error es que el bucket no existe, dar un mensaje más claro
      if (
        uploadError.message?.includes("Bucket not found") ||
        uploadError.message?.includes("not found")
      ) {
        throw new Error(
          "El bucket 'receipts' no está configurado. Por favor, crea el bucket en Supabase Storage:\n" +
            "1. Ve a Storage en el dashboard de Supabase\n" +
            "2. Haz clic en 'New bucket'\n" +
            "3. Nombre: 'receipts'\n" +
            "4. Marca 'Public bucket' ✅\n" +
            "5. Haz clic en 'Create bucket'"
        );
      }
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(filePath);

    return publicUrl;
  };

  const isStripeConfigured = () => {
    return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  };

  const handleStripePaymentForGuest = async () => {
    if (!event || !registrationEmail) return;

    if (!isStripeConfigured()) {
      setRegistrationError(
        "Stripe no está configurado. Por favor, usa la opción de subir comprobante."
      );
      return;
    }

    setProcessingStripe(true);
    setRegistrationError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: event.price * 100,
          currency: "mxn",
          email: registrationEmail,
          eventId: event.id,
          eventName: event.name,
          isGuest: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Error al procesar el pago con Stripe";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          if (response.status === 404) {
            errorMessage =
              "El endpoint de Stripe Checkout no está configurado. Por favor, usa la opción de subir comprobante.";
          }
        }
        setRegistrationError(errorMessage);
        setProcessingStripe(false);
        return;
      }

      const data = await response.json();

      if (!data.sessionId) {
        setRegistrationError("No se recibió la sesión de Stripe.");
        setProcessingStripe(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setRegistrationError("No se pudo inicializar Stripe.");
        setProcessingStripe(false);
        return;
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        setRegistrationError(
          `Error al redirigir a Stripe: ${redirectError.message}`
        );
        setProcessingStripe(false);
      }
    } catch (err: any) {
      setRegistrationError(
        `Error al procesar el pago: ${err.message || "Error desconocido"}`
      );
      setProcessingStripe(false);
    }
  };

  const handleCompleteGuestRegistration = async () => {
    if (!event || !registrationEmail) return;

    setRegistering(true);
    setRegistrationError("");

    try {
      let receiptUrl: string | null = null;

      if (paymentMethod === "manual" && receiptFile) {
        setUploadingReceipt(true);
        try {
          receiptUrl = await uploadReceipt(receiptFile, registrationEmail);
        } catch (uploadErr: any) {
          setRegistrationError(
            "Error al subir el comprobante: " + uploadErr.message
          );
          setUploadingReceipt(false);
          setRegistering(false);
          return;
        }
        setUploadingReceipt(false);
      }

      // Si el evento tiene precio, crear el pago primero
      if (event.price > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          coach_id: null,
          client_id: null,
          client_user_id: null,
          amount: event.price,
          date: new Date().toISOString().split("T")[0],
          status: paymentMethod === "stripe" ? "pending" : "pending",
          method: paymentMethod === "stripe" ? "stripe" : "manual",
          receipt_url: receiptUrl,
          // Agregar email para identificar pagos de usuarios sin cuenta
          email: registrationEmail.toLowerCase().trim(),
        });

        if (paymentError) {
          console.error("Payment insert error details:", paymentError);
          throw paymentError;
        }
      }

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
        setIsPaymentDialogOpen(false);

        // Enviar correo de confirmación
        await sendConfirmationEmail(registrationEmail);
      }
    } catch (error: any) {
      console.error("Error registering with email:", error);
      setRegistrationError(error.message || "Error al registrarse al evento");
    } finally {
      setRegistering(false);
      setUploadingReceipt(false);
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

    // Si el evento tiene precio, debe completar el pago primero
    if (event.price > 0) {
      setIsPaymentDialogOpen(true);
      setIsRegistrationDialogOpen(false);
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

        // Enviar correo de confirmación
        await sendConfirmationEmail(registrationEmail);
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

  // Parse description into sections with improved detection and grouping
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
      // But exclude days of the week and time markers that are part of a program
      const normalizedLine = trimmed
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/:/g, "")
        .trim()
        .toUpperCase();

      // Check for day of week with date (e.g., "VIERNES 12 DE DICIEMBRE")
      const isDayOfWeekWithDate =
        /^(VIERNES|SÁBADO|DOMINGO|LUNES|MARTES|MIÉRCOLES|JUEVES)\s+\d+\s+DE\s+[A-ZÁÉÍÓÚÑ]+/i.test(
          trimmed
        ) ||
        /^(VIERNES|SÁBADO|DOMINGO|LUNES|MARTES|MIÉRCOLES|JUEVES)\s+\d+$/i.test(
          trimmed
        );

      const isDayOfWeek =
        normalizedLine === "VIERNES" ||
        normalizedLine === "SÁBADO" ||
        normalizedLine === "DOMINGO" ||
        normalizedLine === "LUNES" ||
        normalizedLine === "MARTES" ||
        normalizedLine === "MIÉRCOLES" ||
        normalizedLine === "JUEVES";

      const isTitle =
        trimmed.length > 0 &&
        !isDayOfWeek &&
        !isDayOfWeekWithDate &&
        (trimmed === trimmed.toUpperCase() ||
          trimmed.startsWith("**") ||
          trimmed.startsWith("#") ||
          (trimmed.match(/^[A-ZÁÉÍÓÚÑ\s#]+$/) &&
            trimmed.length > 5 &&
            !isDayOfWeekWithDate) || // Only if longer than 5 chars to avoid single words
          trimmed.match(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+:/)); // Pattern: "Título:"

      if (isTitle) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        // Start new section
        const normalizedTitle = normalizedLine;

        const isProgram =
          normalizedTitle.includes("PROGRAMA") ||
          normalizedTitle.includes("HORARIO") ||
          normalizedTitle.includes("CRONOGRAMA");
        const isMaterial =
          normalizedTitle.includes("MATERIAL") ||
          normalizedTitle.includes("SUGERIDO") ||
          normalizedTitle.includes("EQUIPO") ||
          normalizedTitle.includes("REQUERIDO");
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
        // If current section is program type and line is a day of week (with or without date), treat as subtitle
        if (
          currentSection.type === "program" &&
          (isDayOfWeek || isDayOfWeekWithDate)
        ) {
          currentSection.content +=
            (currentSection.content ? "\n\n" : "") + "**" + trimmed + "**";
        } else {
          currentSection.content +=
            (currentSection.content ? "\n" : "") + trimmed;
        }
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

    // Group sections by type and consolidate
    // Only group sections that have a specific type (program, material, etc.)
    // Generic sections without type should remain separate if they have different titles
    const groupedSections = new Map<
      string,
      { title?: string; content: string; type?: string }
    >();

    sections.forEach((section) => {
      if (section.type) {
        // For typed sections, group by type
        const key = section.type;
        if (groupedSections.has(key)) {
          // Merge content from sections of the same type
          const existing = groupedSections.get(key)!;
          existing.content +=
            "\n\n" +
            (section.title ? `**${section.title}**\n` : "") +
            section.content;
          // Keep the first title found, or use a generic one
          if (!existing.title && section.title) {
            existing.title = section.title;
          } else if (
            existing.title &&
            section.title &&
            existing.title !== section.title
          ) {
            // If titles are different, use a more generic title
            const titleMap: Record<string, string> = {
              program: "Programa del Evento",
              material: "Material Sugerido",
              challenge: "El Desafío",
              rules: "Reglas y Normas",
              prizes: "Premios y Categorías",
              registration: "Inscripción y Pago",
            };
            existing.title = titleMap[section.type] || existing.title;
          }
        } else {
          groupedSections.set(key, { ...section });
        }
      } else {
        // For generic sections, use title as key to keep them separate
        const key = section.title || `general-${groupedSections.size}`;
        if (groupedSections.has(key)) {
          const existing = groupedSections.get(key)!;
          existing.content += "\n\n" + section.content;
        } else {
          groupedSections.set(key, { ...section });
        }
      }
    });

    return Array.from(groupedSections.values()).length > 0
      ? Array.from(groupedSections.values())
      : [{ content: desc }];
  };

  const descriptionSections = event.description
    ? parseDescription(event.description)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="RunnerCoach" className="h-6 sm:h-8" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/client/dashboard")}
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Inicio</span>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login" className="text-xs sm:text-sm">
                    Entrar
                  </Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-[#e9540d] hover:bg-[#d14a0b] text-xs sm:text-sm"
                >
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
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 md:mb-8 text-white leading-[0.9] tracking-tighter px-4"
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
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/95 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] px-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Tu propio Ultra Backyard.
                <br />
                <span className="text-[#e9540d]">Tu reto personal.</span>
                <br />
                <span className="text-base sm:text-lg md:text-xl">
                  ¿Por cuántas vueltas vas?
                </span>
              </motion.p>
            ) : (
              <motion.p
                className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] px-4"
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
          {/* Ultra Backyard Special Section */}
          {event.event_type === "ultra_backyard" &&
            event.loop_distance &&
            event.loop_elevation &&
            event.loop_duration && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-16 text-center"
              >
                {/* Intro Text */}
                {event.ultra_backyard_intro && (
                  <div className="mb-8">
                    {event.ultra_backyard_intro
                      .split("\n")
                      .map((line, index) => {
                        if (!line.trim()) return null;
                        if (index === 0) {
                          return (
                            <h2
                              key={index}
                              className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 leading-tight"
                            >
                              {line}
                            </h2>
                          );
                        }
                        return (
                          <p
                            key={index}
                            className="text-2xl md:text-3xl font-bold text-foreground"
                          >
                            {line}
                          </p>
                        );
                      })}
                  </div>
                )}

                {/* Description */}
                {event.ultra_backyard_description && (
                  <div className="mb-12 max-w-4xl mx-auto">
                    <div
                      className="text-lg md:text-xl text-foreground leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{
                        __html: event.ultra_backyard_description
                          .split("\n")
                          .map((line) => {
                            // Convertir **texto** a <strong>
                            let html = line.replace(
                              /\*\*(.+?)\*\*/g,
                              '<strong class="font-bold">$1</strong>'
                            );
                            return html;
                          })
                          .join("<br />"),
                      }}
                    />
                  </div>
                )}

                {/* Icon Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
                  {/* Loop Distance */}
                  <div className="flex flex-col items-center">
                    <div className="mb-4">
                      <img
                        src="/icon-elevation.png"
                        alt="Loop"
                        className="h-24 w-24 md:h-32 md:w-32 object-contain"
                      />
                    </div>
                    <p className="text-xl md:text-2xl font-black text-foreground">
                      LOOP DE {event.loop_distance} KM
                    </p>
                  </div>

                  {/* Elevation */}
                  <div className="flex flex-col items-center">
                    <div className="mb-4">
                      <img
                        src="/icon-elevation-new.png"
                        alt="Elevación"
                        className="h-24 w-24 md:h-32 md:w-32 object-contain"
                      />
                    </div>
                    <p className="text-xl md:text-2xl font-black text-foreground">
                      +{event.loop_elevation} MTS
                    </p>
                  </div>

                  {/* Time */}
                  <div className="flex flex-col items-center">
                    <div className="mb-4">
                      <img
                        src="/icon-time.png"
                        alt="Tiempo"
                        className="h-24 w-24 md:h-32 md:w-32 object-contain"
                      />
                    </div>
                    <p className="text-xl md:text-2xl font-black text-foreground">
                      {event.loop_duration} MINS
                    </p>
                  </div>
                </div>

                {/* Conclusion */}
                {event.ultra_backyard_conclusion && (
                  <div className="max-w-4xl mx-auto space-y-4">
                    {event.ultra_backyard_conclusion
                      .split("\n")
                      .map((line, index) => {
                        if (!line.trim()) return null;
                        // Si la línea es corta y en mayúsculas, es un título
                        if (
                          line === line.toUpperCase() &&
                          line.length < 100 &&
                          !line.includes("**")
                        ) {
                          return (
                            <h3
                              key={index}
                              className="text-2xl md:text-3xl font-black text-foreground mb-2"
                            >
                              {line}
                            </h3>
                          );
                        }
                        return (
                          <p
                            key={index}
                            className="text-lg md:text-xl text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: line.replace(
                                /\*\*(.+?)\*\*/g,
                                '<strong class="font-bold">$1</strong>'
                              ),
                            }}
                          />
                        );
                      })}
                  </div>
                )}
              </motion.div>
            )}

          {/* Key Stats - Consolidated */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <Card className="border-2 border-[#e9540d]/20">
              <CardContent className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-[#e9540d] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        {event.start_date && event.end_date
                          ? "Fechas"
                          : "Fecha"}
                      </p>
                      {event.start_date && event.end_date ? (
                        <p className="text-sm font-bold text-foreground">
                          {format(new Date(event.start_date), "d MMM", {
                            locale: es,
                          })}{" "}
                          -{" "}
                          {format(new Date(event.end_date), "d MMM yyyy", {
                            locale: es,
                          })}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-foreground">
                          {format(new Date(event.date), "d MMM yyyy", {
                            locale: es,
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#e9540d] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Ubicación
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {event.location || "Por confirmar"}
                      </p>
                    </div>
                  </div>

                  {/* Loop Info or Price */}
                  {event.loop_distance &&
                  event.loop_elevation &&
                  event.loop_duration ? (
                    <div className="flex items-start gap-3">
                      <Mountain className="h-5 w-5 text-[#e9540d] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Loop
                        </p>
                        <p className="text-sm font-bold text-[#e9540d]">
                          {event.loop_distance} km
                        </p>
                        <p className="text-xs text-muted-foreground">
                          +{event.loop_elevation} mts • {event.loop_duration}{" "}
                          mins
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <Trophy className="h-5 w-5 text-[#b07a1e] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          Inversión
                        </p>
                        <p className="text-sm font-bold text-[#e9540d]">
                          {event.price === 0 ? (
                            <span className="text-green-600">Gratis</span>
                          ) : (
                            `$${event.price.toLocaleString()} MXN`
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Capacity */}
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-[#e9540d] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Cupo
                      </p>
                      {event.max_capacity ? (
                        <>
                          <p className="text-sm font-bold text-foreground">
                            {registeredCount} / {event.max_capacity}
                          </p>
                          <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#e9540d] h-1.5 rounded-full transition-all"
                              style={{
                                width: `${
                                  (registeredCount / event.max_capacity) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-foreground">
                          {registeredCount} inscritos
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Prize Pool Section (if available) */}
          {event.prize_pool && event.prize_pool > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <Card className="border-2 border-[#b07a1e] bg-gradient-to-br from-[#b07a1e]/10 via-amber-50 to-yellow-50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Trophy className="h-6 w-6 text-[#b07a1e]" />
                    <h2 className="text-2xl font-black text-foreground">
                      Bolsa de Premios
                    </h2>
                  </div>
                  <p className="text-4xl font-black text-[#b07a1e] mb-2">
                    ${event.prize_pool.toLocaleString()} MXN
                  </p>
                  <p className="text-sm text-muted-foreground">
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
              className="mb-8"
            >
              <Card className="border-2 border-[#e9540d]/30 bg-gradient-to-br from-orange-50 to-amber-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-[#e9540d]" />
                    <h2 className="text-xl font-black text-foreground">
                      Programa del Evento
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-[#e9540d] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-[#e9540d]">
                          Inicio:{" "}
                          {format(new Date(event.start_date), "d MMM yyyy", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Trophy className="h-4 w-4 text-[#b07a1e] flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-[#b07a1e]">
                          Final:{" "}
                          {format(new Date(event.end_date), "d MMM yyyy", {
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                    {event.registration_deadline && (
                      <div className="flex items-center gap-3">
                        <Timer className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                            Inscripción hasta:{" "}
                            {format(
                              new Date(event.registration_deadline),
                              "d MMM yyyy",
                              {
                                locale: es,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    )}
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
            className="space-y-6 mb-12"
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
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5 text-[#e9540d]" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="space-y-6">
                          {section.content
                            .split("\n")
                            .reduce((acc, line, lineIndex, array) => {
                              if (!line.trim()) {
                                // Skip empty lines but add spacing if needed
                                if (
                                  lineIndex > 0 &&
                                  array[lineIndex - 1]?.trim()
                                ) {
                                  acc.push(
                                    <div
                                      key={`spacer-${lineIndex}`}
                                      className="h-2"
                                    />
                                  );
                                }
                                return acc;
                              }

                              const trimmed = line.trim();

                              // Check for bold markdown (subtitles like days of week with dates)
                              if (
                                trimmed.startsWith("**") &&
                                trimmed.endsWith("**")
                              ) {
                                const subtitle = trimmed
                                  .replace(/\*\*/g, "")
                                  .trim();
                                acc.push(
                                  <div
                                    key={lineIndex}
                                    className="pt-6 pb-4 border-b-2 border-[#e9540d]/30 first:pt-0"
                                  >
                                    <h3 className="text-2xl md:text-3xl font-black text-[#e9540d] mb-4">
                                      {subtitle}
                                    </h3>
                                  </div>
                                );
                                return acc;
                              }

                              // Check for "Horario:" pattern (e.g., "Horario: 12 a 19 hrs.")
                              const horarioPattern = /^Horario:\s*(.+)/i;
                              if (horarioPattern.test(trimmed)) {
                                const horarioMatch =
                                  trimmed.match(horarioPattern);
                                acc.push(
                                  <div key={lineIndex} className="mb-3">
                                    <p className="text-base md:text-lg text-foreground">
                                      <span className="font-bold">
                                        Horario:
                                      </span>{" "}
                                      <span className="font-semibold">
                                        {horarioMatch?.[1]}
                                      </span>
                                    </p>
                                  </div>
                                );
                                return acc;
                              }

                              // Check for time patterns (e.g., "6:00 a.m.", "12 a 19 hrs.")
                              const timePattern =
                                /^(\d{1,2}:\d{2}\s*(a\.m\.|p\.m\.|am|pm)|\d{1,2}\s+a\s+\d{1,2}\s+hrs?\.)/i;
                              if (timePattern.test(trimmed)) {
                                const timeMatch =
                                  trimmed.match(timePattern)?.[0];
                                const timeText = trimmed
                                  .replace(timePattern, "")
                                  .trim();

                                acc.push(
                                  <div
                                    key={lineIndex}
                                    className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4"
                                  >
                                    <div className="flex-shrink-0 w-full sm:w-32">
                                      <p className="text-base md:text-lg font-bold text-foreground">
                                        {timeMatch}
                                      </p>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-base md:text-lg text-foreground leading-relaxed">
                                        {timeText}
                                      </p>
                                    </div>
                                  </div>
                                );
                                return acc;
                              }

                              // Check for location names (all caps, short, not a day, not a time)
                              if (
                                trimmed === trimmed.toUpperCase() &&
                                trimmed.length > 5 &&
                                trimmed.length < 80 &&
                                !trimmed.match(
                                  /^(VIERNES|SÁBADO|DOMINGO|LUNES|MARTES|MIÉRCOLES|JUEVES)/i
                                ) &&
                                !timePattern.test(trimmed) &&
                                !trimmed.includes("ver en google maps")
                              ) {
                                acc.push(
                                  <div key={lineIndex} className="mb-2 mt-3">
                                    <h4 className="text-lg md:text-xl font-bold text-foreground">
                                      {trimmed}
                                    </h4>
                                  </div>
                                );
                                return acc;
                              }

                              // Check for "ver en google maps" link
                              if (
                                trimmed
                                  .toLowerCase()
                                  .includes("ver en google maps")
                              ) {
                                acc.push(
                                  <div key={lineIndex} className="mb-4">
                                    <a
                                      href="#"
                                      className="text-sm md:text-base text-[#e9540d] hover:text-[#d14a0b] underline font-medium"
                                    >
                                      {trimmed}
                                    </a>
                                  </div>
                                );
                                return acc;
                              }

                              // Regular paragraph
                              acc.push(
                                <p
                                  key={lineIndex}
                                  className="text-base md:text-lg text-foreground leading-relaxed mb-2"
                                >
                                  {trimmed}
                                </p>
                              );
                              return acc;
                            }, [] as React.ReactNode[])}
                        </div>
                      </CardContent>
                    </Card>
                  ) : isMaterial ? (
                    <Card className="border-2 border-[#b07a1e]/30 bg-gradient-to-br from-amber-50 to-yellow-50">
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5 text-[#b07a1e]" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-2">
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
                                    className="flex items-start gap-2 p-2 bg-white/50 rounded"
                                  >
                                    <CheckCircle className="h-4 w-4 text-[#b07a1e] mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">
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
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Flame className="h-5 w-5 text-[#e9540d]" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
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
                                    className="flex items-start gap-2 mb-2 p-2 bg-white/70 rounded"
                                  >
                                    <Zap className="h-4 w-4 text-[#e9540d] mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground font-medium">
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
                                    className="mb-2 text-foreground text-sm"
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
                                  className="mb-2 text-foreground leading-relaxed text-sm"
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
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-gray-700" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
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
                                    className="flex items-start gap-2 mb-2 p-2 bg-white rounded"
                                  >
                                    <CheckCircle className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-2 text-foreground leading-relaxed text-sm"
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
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-[#b07a1e]" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
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
                                    className="flex items-start gap-2 mb-2 p-2 bg-white/70 rounded border-l-2 border-[#b07a1e]"
                                  >
                                    <Trophy className="h-4 w-4 text-[#b07a1e] mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground font-medium">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-2 text-foreground leading-relaxed text-sm"
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
                      <CardContent className="p-6">
                        {section.title && (
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-black text-foreground">
                              {section.title}
                            </h2>
                          </div>
                        )}
                        <div className="prose prose-sm max-w-none">
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
                                    className="flex items-start gap-2 mb-2 p-2 bg-white/70 rounded"
                                  >
                                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">
                                      {paragraph.substring(1).trim()}
                                    </p>
                                  </div>
                                );
                              }
                              return (
                                <p
                                  key={pIndex}
                                  className="mb-2 text-foreground leading-relaxed text-sm"
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
                      <CardContent className="p-6">
                        {section.title && (
                          <h2 className="text-xl font-black mb-4 text-foreground border-b-2 border-[#e9540d] pb-2">
                            {section.title}
                          </h2>
                        )}
                        <div className="prose prose-sm max-w-none">
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
                                    className="flex items-start gap-2 mb-2"
                                  >
                                    <CheckCircle className="h-4 w-4 text-[#e9540d] mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">
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
                                    className="mb-2 text-foreground text-sm"
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
                                  className="mb-2 text-foreground leading-relaxed text-sm"
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
            className="text-center mb-8"
          >
            <Card className="bg-gradient-to-r from-[#e9540d] to-[#d14a0b] border-0 shadow-2xl">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2">
                  ¿Cuál será tu límite?
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-white/90 mb-4 sm:mb-6">
                  Únete a la comunidad de corredores que buscan superarse
                </p>
                {!isFull ? (
                  <>
                    {isRegistered ? (
                      <Badge className="bg-green-500 text-white border-0 px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-lg">
                        <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 mr-2" />
                        Ya estás inscrito
                      </Badge>
                    ) : (
                      <Button
                        size="lg"
                        className="bg-white text-[#e9540d] hover:bg-orange-50 font-black px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl shadow-lg w-full sm:w-auto"
                        onClick={handleRegister}
                        disabled={registering}
                      >
                        {event.external_registration_url ? (
                          <>
                            <ExternalLink className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                            <span className="hidden sm:inline">
                              REGISTRARME EXTERNO
                            </span>
                            <span className="sm:hidden">REGISTRO EXTERNO</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                            {registering
                              ? "Registrando..."
                              : "INSCRIBIRME AHORA"}
                          </>
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge className="bg-white/20 text-white border-white/30 px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-lg">
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

      {/* Diálogo de pago para usuarios sin cuenta */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro al evento</DialogTitle>
            <DialogDescription>
              {event && (
                <>
                  Estás a punto de registrarte a: <strong>{event.name}</strong>
                  <br />
                  Precio: <strong>${event.price.toLocaleString()} MXN</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {registrationError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {registrationError}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-email">Email *</Label>
              <Input
                id="guest-email"
                type="email"
                placeholder="tu@email.com"
                value={registrationEmail}
                onChange={(e) => setRegistrationEmail(e.target.value)}
                disabled={registering}
              />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: "stripe" | "manual") =>
                  setPaymentMethod(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pagar con Stripe
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Subir comprobante
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="receipt">Comprobante de pago</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={registering}
                />
                {receiptFile && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {receiptFile.name}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "stripe" && !isStripeConfigured() && (
              <div className="p-3 text-sm text-yellow-600 bg-yellow-50 rounded-md">
                Stripe no está configurado. Por favor, usa la opción de subir
                comprobante.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setRegistrationEmail("");
                setRegistrationError("");
                setReceiptFile(null);
              }}
              disabled={registering}
            >
              Cancelar
            </Button>
            {paymentMethod === "stripe" ? (
              <Button
                onClick={handleStripePaymentForGuest}
                disabled={
                  processingStripe ||
                  !isStripeConfigured() ||
                  !registrationEmail
                }
              >
                {processingStripe ? "Procesando..." : "Pagar con Stripe"}
              </Button>
            ) : (
              <Button
                onClick={handleCompleteGuestRegistration}
                disabled={
                  uploadingReceipt ||
                  !receiptFile ||
                  !registrationEmail ||
                  registering
                }
              >
                {uploadingReceipt || registering
                  ? "Procesando..."
                  : "Completar registro"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de registro sin cuenta (solo para eventos gratis) */}
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
