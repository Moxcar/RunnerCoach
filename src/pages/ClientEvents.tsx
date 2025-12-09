import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
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
}

export default function ClientEvents() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (user) {
      loadClientData();
    }
  }, [user]);

  useEffect(() => {
    if (coachId) {
      loadEvents();
    }
  }, [coachId, user]);

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
    if (!user || !coachId) return;

    try {
      // Cargar eventos del coach
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("coach_id", coachId)
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // Cargar inscripciones del usuario
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user.id);

      const registeredEventIds = new Set(
        registrations?.map((r) => r.event_id) || []
      );

      // Combinar datos
      const eventsWithRegistration = (eventsData || []).map((event) => ({
        ...event,
        isRegistered: registeredEventIds.has(event.id),
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
    if (!user || !coachId || !selectedEvent) return;

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
          coachId: coachId,
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
    if (!user || !clientId) return;

    // Si el evento es gratis, registrar directamente
    if (event.price === 0) {
      try {
        // Verificar que el usuario tenga el rol de cliente
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw new Error(
            "Error al verificar perfil de usuario: " + profileError.message
          );
        }

        if (profile?.role !== "client") {
          throw new Error("Solo los clientes pueden registrarse a eventos");
        }

        const { error } = await supabase.from("event_registrations").insert({
          event_id: event.id,
          client_id: clientId,
          user_id: user.id,
        });

        if (error) {
          console.error("Registration error details:", error);
          throw error;
        }

        loadEvents();
      } catch (error: any) {
        console.error("Error registering for event:", error);
        alert("Error al inscribirse: " + error.message);
      }
    } else {
      // Si el evento es de pago, abrir diálogo de pago
      setSelectedEvent(event);
      setIsPaymentDialogOpen(true);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!user || !clientId || !selectedEvent) return;

    setError("");
    setUploadingReceipt(false);

    try {
      // Verificar que el usuario tenga el rol de cliente
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error(
          "Error al verificar perfil de usuario: " + profileError.message
        );
      }

      if (profile?.role !== "client") {
        throw new Error("Solo los clientes pueden registrarse a eventos");
      }

      let receiptUrl: string | null = null;

      if (paymentMethod === "manual" && receiptFile) {
        setUploadingReceipt(true);
        receiptUrl = await uploadReceipt(receiptFile, user.id);
      }

      // Crear el pago
      const { error: paymentError } = await supabase.from("payments").insert({
        coach_id: selectedEvent.coach_id,
        client_id: clientId,
        client_user_id: user.id,
        amount: selectedEvent.price,
        date: new Date().toISOString().split("T")[0],
        status: paymentMethod === "stripe" ? "pending" : "pending",
        method: paymentMethod === "stripe" ? "stripe" : "manual",
        receipt_url: receiptUrl,
      });

      if (paymentError) {
        console.error("Payment insert error details:", paymentError);
        throw paymentError;
      }

      // Registrar al evento
      const { error: registrationError } = await supabase
        .from("event_registrations")
        .insert({
          event_id: selectedEvent.id,
          client_id: clientId,
          user_id: user.id,
        });

      if (registrationError) {
        console.error("Registration insert error details:", registrationError);
        throw registrationError;
      }

      setIsPaymentDialogOpen(false);
      setSelectedEvent(null);
      setReceiptFile(null);
      setPaymentMethod("stripe");
      loadEvents();
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

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) >= new Date()
  );
  const pastEvents = events.filter(
    (event) => new Date(event.date) < new Date()
  );

  if (!coachId) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No estás asociado a ningún coach. Contacta a tu coach para que te
              agregue como cliente.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground">
            Explora y regístrate en eventos de tu coach
          </p>
        </div>

        {upcomingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">Próximos eventos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Card key={event.id}>
                  {event.image_url && (
                    <div className="w-full h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                          `$${event.price.toLocaleString()}`
                        )}
                      </span>
                    </div>
                    {event.isRegistered ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Inscrito</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUnregister(event.id)}
                        >
                          Cancelar inscripción
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleRegister(event)}
                      >
                        {event.price === 0 ? "Inscribirse" : "Registrarse"}
                      </Button>
                    )}
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
                <Card key={event.id} className="opacity-60">
                  {event.image_url && (
                    <div className="w-full h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Participaste
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
                    <strong>${selectedEvent.price.toLocaleString()}</strong>
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
