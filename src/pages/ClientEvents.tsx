import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  CreditCard,
  FileText,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getEventUrl, isClientRole } from "@/lib/utils";
import stripePromise from "@/lib/stripe";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  coach_id: string;
  isRegistered: boolean;
  slug?: string | null;
  paymentStatus?:
    | "pending"
    | "approved"
    | "rejected"
    | "completed"
    | "failed"
    | null;
}

export default function ClientEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "manual">(
    "stripe"
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [processingStripe, setProcessingStripe] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      loadClientData();
      loadEvents();
    }
  }, [user]);

  const loadClientData = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("id, coach_id")
        .eq("user_id", user.id)
        .single();

      if (client) {
        setCoachId(client.coach_id);
        setClientId(client.id);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
    }
  };

  const loadEvents = async () => {
    if (!user) return;

    try {
      // Cargar todos los eventos
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // Cargar inscripciones del usuario (por user_id o por email)
      const { data: registrationsByUser, error: userError } = await supabase
        .from("event_registrations")
        .select("event_id, email, user_id")
        .eq("user_id", user.id);

      if (userError) {
        console.error("Error loading registrations by user_id:", userError);
      } else {
        console.log("Registrations by user_id:", registrationsByUser);
      }

      // También buscar registros por email (sin restricción de user_id)
      // Esto cubre casos donde el registro tiene email pero user_id puede ser NULL o no
      let registrationsByEmail: any[] = [];
      if (user.email) {
        try {
          const { data: emailRegistrations, error: emailError } = await supabase
            .from("event_registrations")
            .select("event_id, email, user_id")
            .eq("email", user.email.toLowerCase());

          if (emailError) {
            console.error("Error loading registrations by email:", emailError);
            console.error("Error details:", {
              code: emailError.code,
              message: emailError.message,
              details: emailError.details,
              hint: emailError.hint,
            });
            // Continuar sin los registros por email si hay error
            // Los registros por user_id deberían ser suficientes
          } else {
            console.log("Registrations by email:", emailRegistrations);
            registrationsByEmail = emailRegistrations || [];
          }
        } catch (err) {
          console.error("Exception loading registrations by email:", err);
          // Continuar sin los registros por email
        }
      }

      // Combinar ambos tipos de registros y eliminar duplicados
      const allRegistrations = [
        ...(registrationsByUser || []),
        ...(registrationsByEmail || []),
      ];

      // Eliminar duplicados por event_id
      const uniqueRegistrations = allRegistrations.filter(
        (reg, index, self) =>
          index === self.findIndex((r) => r.event_id === reg.event_id)
      );

      const registeredEventIds = new Set(
        uniqueRegistrations.map((r) => r.event_id)
      );

      console.log("All unique registrations:", uniqueRegistrations);
      console.log("Registered event IDs:", Array.from(registeredEventIds));

      // Cargar pagos del usuario para eventos registrados
      const registeredEventIdsArray = Array.from(registeredEventIds);
      let paymentStatusMap: Record<string, string> = {};

      if (registeredEventIdsArray.length > 0 && user.id) {
        // Buscar todos los pagos del usuario
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("id, status, amount, date, client_user_id")
          .eq("client_user_id", user.id);

        if (paymentsData && paymentsData.length > 0 && eventsData) {
          // Hacer match de pagos con eventos por monto y fecha cercana
          for (const event of eventsData) {
            if (registeredEventIdsArray.includes(event.id) && event.price > 0) {
              // Buscar un pago que coincida con el monto del evento
              const matchingPayment = paymentsData.find(
                (p) => parseFloat(p.amount.toString()) === event.price
              );
              if (matchingPayment) {
                paymentStatusMap[event.id] = matchingPayment.status;
              }
            }
          }
        }
      }

      // Combinar datos
      const eventsWithRegistration = (eventsData || []).map((event) => ({
        ...event,
        isRegistered: registeredEventIds.has(event.id),
        paymentStatus: paymentStatusMap[event.id] || null,
      }));

      setEvents(eventsWithRegistration as Event[]);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const isStripeConfigured = () => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    return key && key.trim() !== "";
  };

  const uploadReceipt = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("receipts").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Por favor, sube un archivo PDF o imagen (JPG, PNG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande. Máximo 5MB");
        return;
      }
      setReceiptFile(file);
      setError("");
    }
  };

  const handleStripePayment = async () => {
    if (!user || !selectedEvent) return;

    // Para Stripe, necesitamos el coach_id del evento
    if (!selectedEvent.coach_id) {
      setError("Este evento no tiene un coach asociado para procesar el pago.");
      return;
    }

    if (!isStripeConfigured()) {
      setError(
        "Stripe no está configurado. Por favor, usa la opción de subir comprobante."
      );
      return;
    }

    setError("");
    setProcessingStripe(true);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: selectedEvent.price * 100,
          currency: "usd",
          userId: user.id,
          email: user.email,
          coachId: selectedEvent.coach_id,
          eventId: selectedEvent.id,
          eventName: selectedEvent.name,
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
        setError(errorMessage);
        setProcessingStripe(false);
        return;
      }

      const data = await response.json();

      if (!data.sessionId) {
        setError("No se recibió la sesión de Stripe.");
        setProcessingStripe(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setError("No se pudo inicializar Stripe.");
        setProcessingStripe(false);
        return;
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        setError(`Error al redirigir a Stripe: ${redirectError.message}`);
        setProcessingStripe(false);
      }
    } catch (err: any) {
      setError(
        `Error al procesar el pago: ${err.message || "Error desconocido"}`
      );
      setProcessingStripe(false);
    }
  };

  const handleRegister = async (event: Event) => {
    if (!user) return;

    // Si no hay clientId, intentar obtenerlo
    let currentClientId = clientId;
    if (!currentClientId) {
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (client) {
          currentClientId = client.id;
          setClientId(client.id);
        }
      } catch (error) {
        console.error("Error loading client:", error);
      }
    }

    // Si el evento es gratis, registrar directamente
    // Cualquier usuario autenticado puede registrarse a eventos
    if (event.price === 0) {
      try {
        const registrationData: any = {
          event_id: event.id,
          user_id: user.id,
        };

        // Solo agregar client_id si existe (opcional)
        if (currentClientId) {
          registrationData.client_id = currentClientId;
        }

        const { error } = await supabase
          .from("event_registrations")
          .insert(registrationData);

        if (error) {
          console.error("Registration error details:", error);
          throw error;
        }

        // Limpiar errores y mostrar mensaje de éxito
        setError("");
        setSuccessMessage("¡Te has inscrito exitosamente al evento!");
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);

        // Recargar eventos para actualizar el estado
        await loadEvents();
      } catch (error: any) {
        console.error("Error registering for event:", error);
        setError("Error al inscribirse: " + error.message);
      }
    } else {
      // Si el evento es de pago, abrir diálogo de pago
      setSelectedEvent(event);
      setIsPaymentDialogOpen(true);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!user || !selectedEvent) return;

    // Asegurar que tenemos clientId si es necesario para el pago
    let currentClientId = clientId;
    if (!currentClientId) {
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (client) {
          currentClientId = client.id;
          setClientId(client.id);
        }
      } catch (error) {
        console.error("Error loading client:", error);
      }
    }

    setError("");
    setUploadingReceipt(false);

    try {
      // Verificar que el usuario esté autenticado (cualquier usuario puede registrarse a eventos)
      // No requerimos verificación de rol específico, solo que el usuario esté autenticado

      let receiptUrl: string | null = null;

      if (paymentMethod === "manual" && receiptFile) {
        setUploadingReceipt(true);
        receiptUrl = await uploadReceipt(receiptFile, user.id);
      }

      // Crear el pago (solo si hay coach_id en el evento y el evento tiene precio)
      if (selectedEvent.coach_id && selectedEvent.price > 0) {
        const paymentData: any = {
          coach_id: selectedEvent.coach_id,
          client_user_id: user.id,
          amount: selectedEvent.price,
          date: new Date().toISOString().split("T")[0],
          status: paymentMethod === "stripe" ? "pending" : "pending",
          method: paymentMethod === "stripe" ? "stripe" : "manual",
          receipt_url: receiptUrl,
        };

        // Solo agregar client_id si existe
        if (currentClientId) {
          paymentData.client_id = currentClientId;
        }

        const { error: paymentError } = await supabase
          .from("payments")
          .insert(paymentData);

        if (paymentError) {
          console.error("Payment insert error details:", paymentError);
          throw paymentError;
        }
      }

      // Registrar al evento
      const registrationData: any = {
        event_id: selectedEvent.id,
        user_id: user.id,
      };

      // Solo agregar client_id si existe
      if (currentClientId) {
        registrationData.client_id = currentClientId;
      }

      const { error: registrationError } = await supabase
        .from("event_registrations")
        .insert(registrationData);

      if (registrationError) {
        console.error("Registration insert error details:", registrationError);
        throw registrationError;
      }

      // Limpiar errores y mostrar mensaje de éxito
      setError("");
      let successMsg = "¡Te has inscrito exitosamente al evento!";
      if (receiptUrl) {
        successMsg +=
          " Tu comprobante de pago ha sido subido correctamente y está pendiente de revisión.";
      } else if (paymentMethod === "stripe") {
        successMsg += " El pago se procesará a través de Stripe.";
      }
      setSuccessMessage(successMsg);
      setTimeout(() => {
        setSuccessMessage("");
      }, 6000);

      setIsPaymentDialogOpen(false);
      setSelectedEvent(null);
      setReceiptFile(null);
      setPaymentMethod("stripe");

      // Recargar eventos para actualizar el estado
      await loadEvents();
    } catch (error: any) {
      console.error("Error completing registration:", error);
      setError(error.message || "Error al completar el registro");
      setUploadingReceipt(false);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Recargar eventos
      loadEvents();
    } catch (error: any) {
      console.error("Error unregistering from event:", error);
      alert("Error al cancelar inscripción: " + error.message);
    }
  };

  // Normalizar fecha de hoy a medianoche para comparar solo fechas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  const pastEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground">
            Explora y regístrate en eventos disponibles
          </p>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {successMessage}
            </p>
          </motion.div>
        )}

        {/* Mensaje de error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto text-destructive hover:text-destructive/80"
            >
              ×
            </button>
          </motion.div>
        )}

        {upcomingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">Próximos eventos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <div className="relative w-full h-48 overflow-hidden bg-gray-900">
                    {/* Background Image: event image or gradient background */}
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
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
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.date), "dd MMM yyyy", {
                          locale: es,
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-muted-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-lg font-semibold">
                        {event.price === 0 ? (
                          <span className="text-green-600">Gratis</span>
                        ) : (
                          `$${event.price.toLocaleString()} MXN`
                        )}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(getEventUrl(event))}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </Button>
                      {event.isRegistered ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                              Ya estás inscrito
                            </span>
                          </div>
                          {event.price > 0 && event.paymentStatus && (
                            <div className="flex items-center justify-center">
                              <Badge
                                variant={
                                  event.paymentStatus === "approved" ||
                                  event.paymentStatus === "completed"
                                    ? "default"
                                    : event.paymentStatus === "rejected" ||
                                      event.paymentStatus === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                  event.paymentStatus === "approved" ||
                                  event.paymentStatus === "completed"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : event.paymentStatus === "rejected" ||
                                      event.paymentStatus === "failed"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-yellow-600 hover:bg-yellow-700"
                                }
                              >
                                {event.paymentStatus === "pending" &&
                                  "Pago pendiente"}
                                {event.paymentStatus === "approved" &&
                                  "Pago aprobado"}
                                {event.paymentStatus === "rejected" &&
                                  "Pago rechazado"}
                                {event.paymentStatus === "completed" &&
                                  "Pago completado"}
                                {event.paymentStatus === "failed" &&
                                  "Pago fallido"}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleRegister(event)}
                        >
                          {event.price === 0 ? "Inscribirse" : "Registrarse"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {pastEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-4">Eventos pasados</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <Card key={event.id} className="opacity-60 overflow-hidden">
                  <div className="relative w-full h-48 overflow-hidden bg-gray-900">
                    {/* Background Image: event image or gradient background */}
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
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
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.date), "dd MMM yyyy", {
                          locale: es,
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.isRegistered && (
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                          Participaste en este evento
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {events.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay eventos disponibles
              </p>
            </CardContent>
          </Card>
        )}

        {/* Diálogo de pago para eventos de pago */}
        <Dialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registro al evento</DialogTitle>
              <DialogDescription>
                {selectedEvent && (
                  <>
                    Estás a punto de registrarte a:{" "}
                    <strong>{selectedEvent.name}</strong>
                    <br />
                    Precio:{" "}
                    <strong>${selectedEvent.price.toLocaleString()} MXN</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-4 py-4">
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
                  setError("");
                  setReceiptFile(null);
                }}
              >
                Cancelar
              </Button>
              {paymentMethod === "stripe" ? (
                <Button
                  onClick={handleStripePayment}
                  disabled={processingStripe || !isStripeConfigured()}
                >
                  {processingStripe ? "Procesando..." : "Pagar con Stripe"}
                </Button>
              ) : (
                <Button
                  onClick={handleCompleteRegistration}
                  disabled={uploadingReceipt || !receiptFile}
                >
                  {uploadingReceipt ? "Subiendo..." : "Completar registro"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
