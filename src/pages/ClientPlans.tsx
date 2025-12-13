import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
  Package,
  Check,
  CreditCard,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isClientRole } from "@/lib/utils";
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
import stripePromise from "@/lib/stripe";

interface Plan {
  id: string;
  name: string;
  cost: number;
  features: string[];
  is_active: boolean;
}

interface ClientPlan {
  plan_id: string | null;
  plan: Plan | null;
}

export default function ClientPlans() {
  const { user, role } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ClientPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  // Estados para el pago del plan
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "stripe" | "manual" | "cash"
  >("manual");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [processingStripe, setProcessingStripe] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    if (user) {
      loadPlans();
      loadCurrentPlan();
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("cost", { ascending: true });

      if (error) throw error;
      setPlans((data as Plan[]) || []);
    } catch (error: any) {
      console.error("Error loading plans:", error);
      setError(error.message || "Error al cargar los planes");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPlan = async () => {
    if (!user) return;

    try {
      // Obtener el cliente asociado
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, plan_id, coach_id, plans(*)")
        .eq("user_id", user.id)
        .single();

      if (clientError && clientError.code !== "PGRST116") {
        throw clientError;
      }

      if (clientData) {
        setClientId(clientData.id);
        setCoachId(clientData.coach_id);
        setCurrentPlan({
          plan_id: clientData.plan_id,
          plan: clientData.plans as Plan | null,
        });
      }
    } catch (error: any) {
      console.error("Error loading current plan:", error);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleEnrollPlan = async () => {
    if (!user || !selectedPlan) {
      setError("Faltan datos necesarios para suscribirse al plan");
      return;
    }

    // Verificar el rol del usuario
    if (role === null) {
      setError("Cargando información del usuario...");
      return;
    }

    // El rol del contexto ya está mapeado correctamente (user -> client)
    // pero verificamos por si acaso
    if (role !== "client") {
      setError("Solo los clientes pueden suscribirse a planes");
      return;
    }

    try {
      setError("");
      setLoading(true);

      // Obtener o crear el clientId si no existe
      let currentClientId = clientId;

      if (!currentClientId) {
        // Intentar obtener el cliente existente
        const { data: existingClient, error: fetchError } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (existingClient) {
          currentClientId = existingClient.id;
          setClientId(existingClient.id);
        } else {
          // Verificar que el usuario tenga un perfil con rol 'user' (que es equivalente a 'client')
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("id, role")
            .eq("id", user.id)
            .single();

          if (profileError || !profile) {
            throw new Error(
              "No se encontró tu perfil de usuario. Por favor, contacta al administrador."
            );
          }

          // Verificar que el usuario tenga rol de cliente (user o client)
          if (!isClientRole(profile.role)) {
            throw new Error(
              `Tu perfil tiene el rol "${profile.role}" pero necesitas ser un cliente para suscribirte a un plan.`
            );
          }

          // Intentar crear el registro del cliente sin coach (el admin puede asignarlo después)
          const { data: newClient, error: createError } = await supabase
            .from("clients")
            .insert({
              user_id: user.id,
              name: user.email?.split("@")[0] || "Cliente",
              email: user.email || "",
              phone: "",
              payment_status: "pending",
              coach_id: null, // Se asignará después por un admin
            })
            .select("id")
            .single();

          if (createError) {
            console.error("Error creating client record:", createError);
            throw new Error(
              `No se pudo crear el registro de cliente: ${
                createError.message || createError.code || "Error desconocido"
              }. Por favor, contacta al administrador.`
            );
          }

          currentClientId = newClient.id;
          setClientId(newClient.id);
        }
      }

      if (!currentClientId) {
        throw new Error("No se pudo obtener o crear el registro de cliente");
      }

      // Actualizar el plan del cliente
      const { error: updateError } = await supabase
        .from("clients")
        .update({ plan_id: selectedPlan.id })
        .eq("id", currentClientId);

      if (updateError) throw updateError;

      await loadCurrentPlan();
      setIsDialogOpen(false);
      setSelectedPlan(null);
    } catch (error: any) {
      console.error("Error enrolling in plan:", error);
      setError(error.message || "Error al apuntarse al plan");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!user || !clientId) return;

    if (!confirm("¿Estás seguro de que deseas cancelar tu plan actual?"))
      return;

    try {
      setError("");
      setLoading(true);

      const { error: updateError } = await supabase
        .from("clients")
        .update({ plan_id: null })
        .eq("id", clientId);

      if (updateError) throw updateError;

      await loadCurrentPlan();
    } catch (error: any) {
      console.error("Error canceling plan:", error);
      setError(error.message || "Error al cancelar el plan");
    } finally {
      setLoading(false);
    }
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
        setPaymentError("Por favor, sube un archivo PDF o imagen (JPG, PNG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPaymentError("El archivo es demasiado grande. Máximo 5MB");
        return;
      }
      setReceiptFile(file);
      setPaymentError("");
    }
  };

  const isStripeConfigured = () => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    return key && key.trim() !== "";
  };

  const handleStripePaymentForPlan = async () => {
    if (!user || !coachId || !currentPlan?.plan) {
      setPaymentError("Faltan datos necesarios para procesar el pago");
      return;
    }

    if (!isStripeConfigured()) {
      setPaymentError(
        "Stripe no está configurado. Por favor, usa la opción de subir comprobante."
      );
      return;
    }

    setPaymentError("");
    setProcessingStripe(true);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: currentPlan.plan.cost * 100,
          currency: "usd",
          userId: user.id,
          email: user.email,
          coachId: coachId,
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
          } else {
            errorMessage = `Error al procesar el pago (${response.status}). Por favor, intenta más tarde.`;
          }
        }
        setPaymentError(errorMessage);
        setProcessingStripe(false);
        return;
      }

      const data = await response.json();

      if (!data.sessionId) {
        setPaymentError(
          "No se recibió la sesión de Stripe. Por favor, verifica la configuración."
        );
        setProcessingStripe(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setPaymentError(
          "No se pudo inicializar Stripe. Por favor, verifica la configuración."
        );
        setProcessingStripe(false);
        return;
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        setPaymentError(
          `Error al redirigir a Stripe: ${redirectError.message}`
        );
        setProcessingStripe(false);
      }
    } catch (err: any) {
      setPaymentError(
        `Error al procesar el pago: ${err.message || "Error desconocido"}`
      );
      setProcessingStripe(false);
    }
  };

  const handlePayPlan = async () => {
    if (!user || !coachId || !clientId || !currentPlan?.plan) {
      setPaymentError("Faltan datos necesarios para procesar el pago");
      return;
    }

    if (paymentMethod === "stripe") {
      await handleStripePaymentForPlan();
      return;
    }

    setPaymentError("");
    setUploadingReceipt(false);

    try {
      let receiptUrl: string | null = null;

      if (paymentMethod === "manual" && receiptFile) {
        setUploadingReceipt(true);
        try {
          receiptUrl = await uploadReceipt(receiptFile, user.id);
        } catch (uploadErr: any) {
          setPaymentError(
            "Error al subir el comprobante: " + uploadErr.message
          );
          setUploadingReceipt(false);
          return;
        }
        setUploadingReceipt(false);
      }

      const { error: paymentError } = await supabase.from("payments").insert({
        coach_id: coachId,
        client_id: clientId,
        client_user_id: user.id,
        amount: currentPlan.plan.cost,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        method: paymentMethod,
        receipt_url: receiptUrl,
      });

      if (paymentError) throw paymentError;

      setIsPaymentDialogOpen(false);
      setReceiptFile(null);
      setPaymentMethod("manual");
      setPaymentError("");
    } catch (error: any) {
      console.error("Error processing plan payment:", error);
      setPaymentError("Error al procesar el pago: " + error.message);
      setUploadingReceipt(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
        <div>
          <motion.div
            className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Planes de Suscripción
            </h1>
          </motion.div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Elige el plan perfecto para alcanzar tus objetivos de running
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20"
          >
            {error}
          </motion.div>
        )}

        {/* Current Plan */}
        {currentPlan?.plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card/90 to-secondary/10 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl" />
              <CardHeader className="relative z-10 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg flex-shrink-0">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl break-words">
                        <span className="hidden sm:inline">Plan Actual: </span>
                        <span className="sm:hidden">Actual: </span>
                        {currentPlan.plan.name}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Estás suscrito a este plan
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={() => setIsPaymentDialogOpen(true)}
                      disabled={loading || !coachId}
                      className="bg-primary hover:bg-primary/90 text-xs sm:text-sm py-2 sm:py-2.5 w-full sm:w-auto"
                    >
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">
                        Pagar Plan Mensual
                      </span>
                      <span className="sm:hidden">Pagar Plan</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelPlan}
                      disabled={loading}
                      className="border-destructive/30 hover:bg-destructive/10 text-xs sm:text-sm py-2 sm:py-2.5 w-full sm:w-auto"
                    >
                      Cancelar Plan
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-baseline gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ${currentPlan.plan.cost.toFixed(2)} MXN
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    /mes
                  </span>
                </div>
                <ul className="space-y-2 sm:space-y-3">
                  {currentPlan.plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 sm:gap-3">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-muted-foreground break-words">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Available Plans */}
        <div>
          <motion.div
            className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-secondary flex-shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
              {currentPlan?.plan ? "Cambiar de Plan" : "Planes Disponibles"}
            </h2>
          </motion.div>

          {loading && plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando planes...
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay planes disponibles en este momento
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const isCurrentPlan = currentPlan?.plan_id === plan.id;
                const isPopular = index === Math.floor(plans.length / 2);
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -15, scale: 1.03 }}
                    className="group relative"
                  >
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-sm font-semibold shadow-lg">
                          Más Popular
                        </Badge>
                      </div>
                    )}
                    <Card
                      className={`relative h-full backdrop-blur-xl rounded-3xl overflow-hidden border shadow-xl hover:shadow-2xl transition-all duration-300 ${
                        isCurrentPlan
                          ? "bg-gradient-to-br from-primary/20 via-card/90 to-secondary/20 border-primary/40 ring-2 ring-primary/30"
                          : isPopular
                          ? "bg-gradient-to-br from-primary/20 via-card/90 to-secondary/20 border-primary/40"
                          : "bg-gradient-to-br from-card/90 to-card/50 border-primary/20"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardHeader className="relative z-10 p-4 sm:p-6">
                        <CardTitle className="text-xl sm:text-2xl mb-2 break-words">
                          {plan.name}
                        </CardTitle>
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            ${plan.cost.toFixed(2)} MXN
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            /mes
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 p-4 sm:p-6 pt-0 sm:pt-0">
                        <ul className="space-y-2 sm:space-y-3 md:space-y-4 mb-6 sm:mb-8">
                          {plan.features.map((feature, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-start gap-2 sm:gap-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.4,
                                delay: index * 0.1 + idx * 0.05,
                              }}
                            >
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-xs sm:text-sm text-muted-foreground break-words">
                                {feature}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                        {isCurrentPlan ? (
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-xs sm:text-sm py-2 sm:py-2.5"
                            disabled
                          >
                            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Plan Actual
                          </Button>
                        ) : (
                          <Button
                            className={`w-full group/btn text-xs sm:text-sm py-2 sm:py-2.5 ${
                              isPopular
                                ? "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                                : ""
                            }`}
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSelectPlan(plan)}
                          >
                            <span className="hidden sm:inline">
                              {currentPlan?.plan
                                ? "Cambiar a este Plan"
                                : "Elegir Plan"}
                            </span>
                            <span className="sm:hidden">
                              {currentPlan?.plan ? "Cambiar" : "Elegir"}
                            </span>
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1.5 sm:ml-2 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Suscripción</DialogTitle>
              <DialogDescription>
                {currentPlan?.plan
                  ? `¿Estás seguro de que deseas cambiar de "${currentPlan.plan.name}" a "${selectedPlan?.name}"?`
                  : `¿Estás seguro de que deseas suscribirte al plan "${selectedPlan?.name}"?`}
              </DialogDescription>
            </DialogHeader>
            {selectedPlan && (
              <div className="py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">{selectedPlan.name}</p>
                  <p className="text-2xl font-bold mb-4">
                    ${selectedPlan.cost.toFixed(2)} MXN/mes
                  </p>
                  <ul className="space-y-2 text-sm">
                    {selectedPlan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {selectedPlan.features.length > 3 && (
                      <li className="text-muted-foreground">
                        +{selectedPlan.features.length - 3} características más
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleEnrollPlan} disabled={loading}>
                {loading
                  ? "Procesando..."
                  : currentPlan?.plan
                  ? "Cambiar Plan"
                  : "Confirmar Suscripción"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pagar Plan Mensual</DialogTitle>
              <DialogDescription>
                Realiza el pago de tu plan: {currentPlan?.plan?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {paymentError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {paymentError}
                </div>
              )}

              {currentPlan?.plan && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">{currentPlan.plan.name}</p>
                  <p className="text-2xl font-bold">
                    ${currentPlan.plan.cost.toFixed(2)} MXN
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pago mensual del plan
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment-method">Método de pago</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: "stripe" | "manual" | "cash") => {
                    setPaymentMethod(value);
                    setReceiptFile(null);
                    setPaymentError("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagar con Stripe
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Subir comprobante
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="receipt">Comprobante de transferencia</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {receiptFile && (
                      <span className="text-sm text-muted-foreground">
                        {receiptFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceptados: PDF, JPG, PNG (máx. 5MB)
                  </p>
                </div>
              )}

              {paymentMethod === "stripe" && (
                <div className="space-y-2">
                  {!isStripeConfigured() ? (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm">
                      <p className="font-medium mb-1">
                        ⚠️ Stripe no está configurado
                      </p>
                      <p>
                        Para usar pagos con Stripe, configura la variable de
                        entorno{" "}
                        <code className="bg-yellow-100 px-1 rounded">
                          VITE_STRIPE_PUBLISHABLE_KEY
                        </code>
                        . Por ahora, puedes usar la opción de subir comprobante.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                      <p>
                        Al hacer clic en "Pagar con Stripe", serás redirigido a
                        Stripe para completar el pago de forma segura.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setPaymentError("");
                  setReceiptFile(null);
                }}
                disabled={uploadingReceipt || processingStripe}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePayPlan}
                disabled={
                  uploadingReceipt ||
                  processingStripe ||
                  (paymentMethod === "stripe" && !isStripeConfigured()) ||
                  (paymentMethod === "manual" &&
                    !receiptFile &&
                    paymentMethod !== "cash") ||
                  !coachId
                }
              >
                {uploadingReceipt
                  ? "Subiendo comprobante..."
                  : processingStripe
                  ? "Procesando pago..."
                  : paymentMethod === "stripe"
                  ? "Pagar con Stripe"
                  : "Registrar Pago"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
