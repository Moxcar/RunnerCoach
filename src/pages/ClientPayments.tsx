import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, CreditCard, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import stripePromise from "@/lib/stripe";

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  method: "stripe" | "manual" | "cash";
  coach_id: string;
}

export default function ClientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "manual" as Payment["method"],
  });
  const [coachId, setCoachId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [processingStripe, setProcessingStripe] = useState(false);
  const [error, setError] = useState("");

  // Función helper para verificar si Stripe está configurado
  const isStripeConfigured = () => {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    return key && key.trim() !== "";
  };

  useEffect(() => {
    if (user) {
      loadClientData();
      loadPayments();
    }
  }, [user]);

  const loadClientData = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("coach_id")
        .eq("user_id", user.id)
        .single();

      if (client) {
        setCoachId(client.coach_id);
      }
    } catch (error) {
      console.error("Error loading client data:", error);
    }
  };

  const loadPayments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("client_user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      if (data) {
        setPayments(data as Payment[]);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
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
      // Validar tipo de archivo
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
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande. Máximo 5MB");
        return;
      }
      setReceiptFile(file);
      setError("");
    }
  };

  const handleStripePayment = async () => {
    if (
      !user ||
      !coachId ||
      !formData.amount ||
      parseFloat(formData.amount) <= 0
    ) {
      setError("Por favor, ingresa un monto válido");
      return;
    }

    // Verificar si Stripe está configurado
    if (!isStripeConfigured()) {
      setError(
        "Stripe no está configurado. Por favor, configura VITE_STRIPE_PUBLISHABLE_KEY en las variables de entorno. Por ahora, puedes usar la opción de subir comprobante."
      );
      return;
    }

    setError("");
    setProcessingStripe(true);

    try {
      // Crear checkout session (necesitarás un endpoint backend para esto)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount) * 100, // Convertir a centavos
          currency: "usd",
          userId: user.id,
          email: user.email,
          coachId: coachId,
        }),
      });

      if (!response.ok) {
        // Intentar obtener más información del error
        let errorMessage = "Error al procesar el pago con Stripe";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Si no se puede parsear el error, usar el status
          if (response.status === 404) {
            errorMessage =
              "El endpoint de Stripe Checkout no está configurado. Por favor, configura el backend o usa la opción de subir comprobante.";
          } else if (response.status === 500) {
            errorMessage =
              "Error en el servidor al procesar el pago. Por favor, intenta más tarde o usa la opción de subir comprobante.";
          } else {
            errorMessage = `Error al procesar el pago (${response.status}). Por favor, intenta más tarde o usa la opción de subir comprobante.`;
          }
        }
        setError(errorMessage);
        setProcessingStripe(false);
        return;
      }

      const data = await response.json();

      if (!data.sessionId) {
        setError(
          "No se recibió la sesión de Stripe. Por favor, verifica la configuración del backend o usa la opción de subir comprobante."
        );
        setProcessingStripe(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setError(
          "No se pudo inicializar Stripe. Por favor, verifica que VITE_STRIPE_PUBLISHABLE_KEY esté configurado correctamente."
        );
        setProcessingStripe(false);
        return;
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        setError(
          `Error al redirigir a Stripe: ${redirectError.message}. Por favor, intenta más tarde o usa la opción de subir comprobante.`
        );
        setProcessingStripe(false);
      }
      // Si todo está bien, el usuario será redirigido a Stripe
    } catch (err: any) {
      let errorMessage = "Error al procesar el pago con Stripe";

      if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage =
          "No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet o configura el endpoint de Stripe. Puedes usar la opción de subir comprobante como alternativa.";
      } else {
        errorMessage = `Error inesperado: ${err.toString()}`;
      }

      setError(
        `${errorMessage} Por favor, intenta más tarde o usa la opción de subir comprobante.`
      );
      setProcessingStripe(false);
    }
  };

  const handleAddPayment = async () => {
    if (!user || !coachId) return;

    // Si el método es Stripe, manejar de forma diferente
    if (formData.method === "stripe") {
      await handleStripePayment();
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Por favor, ingresa un monto válido");
      return;
    }

    setError("");
    setUploadingReceipt(false);

    try {
      // Obtener client_id
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!client) {
        setError("No se encontró tu registro de cliente. Contacta a tu coach.");
        return;
      }

      let receiptUrl: string | null = null;

      // Si hay un comprobante, subirlo
      if (receiptFile && formData.method === "manual") {
        setUploadingReceipt(true);
        try {
          receiptUrl = await uploadReceipt(receiptFile, user.id);
        } catch (uploadErr: any) {
          setError("Error al subir el comprobante: " + uploadErr.message);
          setUploadingReceipt(false);
          return;
        }
        setUploadingReceipt(false);
      }

      const { error } = await supabase.from("payments").insert({
        coach_id: coachId,
        client_id: client.id,
        client_user_id: user.id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: "pending",
        method: formData.method,
        receipt_url: receiptUrl,
      });

      if (error) throw error;

      setIsDialogOpen(false);
      setFormData({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "manual",
      });
      setReceiptFile(null);
      setError("");
      loadPayments();
    } catch (error: any) {
      console.error("Error adding payment:", error);
      setError("Error al registrar el pago: " + error.message);
      setUploadingReceipt(false);
    }
  };

  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  // Calcular siguiente pago (próximo pago pendiente más cercano)
  const nextPayment = payments
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const getStatusBadge = (status: Payment["status"]) => {
    const styles = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-orange-100 text-orange-800",
      failed: "bg-red-100 text-red-800",
    };

    const labels = {
      completed: "Completado",
      pending: "Pendiente",
      failed: "Fallido",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getMethodLabel = (method: Payment["method"]) => {
    const labels = {
      stripe: "Stripe",
      manual: "Manual",
      cash: "Efectivo",
    };
    return labels[method];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Mis Pagos</h1>
            <p className="text-muted-foreground">
              Gestiona tus pagos y visualiza tu historial
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar nuevo pago</DialogTitle>
                <DialogDescription>
                  Registra un pago realizado a tu coach
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      setFormData({ ...formData, amount: e.target.value });
                      setError("");
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Método de pago</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value: Payment["method"]) => {
                      setFormData({ ...formData, method: value });
                      setReceiptFile(null);
                      setError("");
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

                {formData.method === "manual" && (
                  <div className="space-y-2">
                    <Label htmlFor="receipt">
                      Comprobante de transferencia
                    </Label>
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

                {formData.method === "stripe" && (
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
                          . Por ahora, puedes usar la opción de subir
                          comprobante.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
                        <p>
                          Al hacer clic en "Pagar con Stripe", serás redirigido
                          a Stripe para completar el pago de forma segura.
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
                    setIsDialogOpen(false);
                    setError("");
                    setReceiptFile(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddPayment}
                  disabled={
                    uploadingReceipt ||
                    processingStripe ||
                    (formData.method === "stripe" && !isStripeConfigured())
                  }
                >
                  {uploadingReceipt
                    ? "Subiendo comprobante..."
                    : processingStripe
                    ? "Procesando pago..."
                    : formData.method === "stripe"
                    ? "Pagar con Stripe"
                    : "Registrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Siguiente pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextPayment ? (
                <div>
                  <div className="text-2xl font-bold">
                    ${parseFloat(nextPayment.amount.toString()).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(nextPayment.date), "dd MMM yyyy", {
                      locale: es,
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">
                  No hay pagos pendientes
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pendiente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${pendingAmount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.date), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          $
                          {parseFloat(
                            payment.amount.toString()
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>{getMethodLabel(payment.method)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
