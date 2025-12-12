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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  X,
  DollarSign,
  Plus,
  Calculator,
  CreditCard,
  Users,
  Eye,
  FileImage,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllCoachPayments,
  createCoachPayment,
  completeCoachPayment,
  calculatePendingPaymentsForCoach,
  calculateAllCoachesPaymentsForMonth,
  createBulkCoachPayments,
  type CoachPayment,
  type CoachMonthlyPaymentSummary,
} from "@/services/coachPayments";
import { getAllCoaches } from "@/services/adminService";

interface ClientPayment {
  id: string;
  client_name: string;
  client_email: string;
  coach_name: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  method: string;
  receipt_url: string | null;
}

export default function AdminPayments() {
  const { user } = useAuth();
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [coachPayments, setCoachPayments] = useState<CoachPayment[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("client");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isCoachPaymentDialogOpen, setIsCoachPaymentDialogOpen] =
    useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(
    null
  );
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(
    null
  );
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  const [pendingPaymentsData, setPendingPaymentsData] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [monthlyCalculations, setMonthlyCalculations] = useState<
    CoachMonthlyPaymentSummary[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Mes anterior por defecto
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonth.getFullYear()}-${String(
      lastMonth.getMonth() + 1
    ).padStart(2, "0")}`;
  });
  const [isCalculatingMonthly, setIsCalculatingMonthly] = useState(false);
  const [selectedCoachesForBulk, setSelectedCoachesForBulk] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    if (user) {
      loadClientPayments();
      loadCoachPayments();
      loadCoaches();
    }
  }, [user, activeTab]);

  const loadClientPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Primero obtener los pagos sin relaciones complejas
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select(
          "id, amount, date, status, method, email, coach_id, client_id, client_user_id, receipt_url"
        )
        .order("date", { ascending: false });

      if (paymentsError) throw paymentsError;

      if (!payments || payments.length === 0) {
        setClientPayments([]);
        return;
      }

      // Obtener todos los IDs únicos necesarios
      const clientIds = [
        ...new Set(payments.map((p: any) => p.client_id).filter(Boolean)),
      ];
      const clientUserIds = [
        ...new Set(payments.map((p: any) => p.client_user_id).filter(Boolean)),
      ];
      const coachIds = [
        ...new Set(payments.map((p: any) => p.coach_id).filter(Boolean)),
      ];

      // Obtener user_id de clients para luego buscar en user_profiles
      const clientToUserIdMap = new Map<string, string>();
      const clientEmailMap = new Map<string, string>();
      const clientCoachIdMap = new Map<string, string | null>();
      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from("clients")
          .select("id, user_id, email, coach_id")
          .in("id", clientIds);

        if (!clientsError && clients) {
          clients.forEach((client: any) => {
            if (client.user_id) {
              clientToUserIdMap.set(client.id, client.user_id);
            }
            if (client.email) {
              clientEmailMap.set(client.id, client.email);
            }
            clientCoachIdMap.set(client.id, client.coach_id);
          });
        }
      }

      // Obtener todos los user_ids únicos para buscar en user_profiles
      const allUserIds = new Set<string>();
      // Agregar client_user_ids directos
      clientUserIds.forEach((id) => allUserIds.add(id));
      // Agregar user_ids obtenidos de clients
      clientToUserIdMap.forEach((userId) => allUserIds.add(userId));

      // Obtener nombres de clientes desde user_profiles (solo full_name, no tiene email)
      const clientUserMap = new Map<string, string>();
      if (allUserIds.size > 0) {
        const { data: userProfiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", Array.from(allUserIds));

        if (!profilesError && userProfiles) {
          userProfiles.forEach((profile: any) => {
            if (profile.full_name) {
              clientUserMap.set(profile.id, profile.full_name);
            }
          });
        }
      }

      // Obtener nombres de coaches
      const coachMap = new Map<string, string>();
      if (coachIds.length > 0) {
        const { data: coaches, error: coachesError } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", coachIds);

        if (!coachesError && coaches) {
          coaches.forEach((coach: any) => {
            if (coach.full_name) {
              coachMap.set(coach.id, coach.full_name);
            }
          });
        }
      }

      // Formatear los pagos
      const formattedPayments: ClientPayment[] = payments.map((p: any) => {
        // Obtener nombre del cliente desde user_profiles
        let clientName = "Cliente desconocido";
        let clientEmail = "";

        // Prioridad 1: Si hay client_user_id, buscar directamente en user_profiles
        if (p.client_user_id) {
          if (clientUserMap.has(p.client_user_id)) {
            clientName = clientUserMap.get(p.client_user_id)!;
          }
        }

        // Prioridad 2: Si no encontramos nombre y hay client_id, obtener user_id y buscar en user_profiles
        if (
          clientName === "Cliente desconocido" &&
          p.client_id &&
          clientToUserIdMap.has(p.client_id)
        ) {
          const userId = clientToUserIdMap.get(p.client_id)!;
          if (clientUserMap.has(userId)) {
            clientName = clientUserMap.get(userId)!;
          }
        }

        // Obtener email: primero de clients, luego del pago
        if (p.client_id && clientEmailMap.has(p.client_id)) {
          clientEmail = clientEmailMap.get(p.client_id)!;
        } else if (p.email) {
          clientEmail = p.email;
        }

        // Si no tenemos nombre pero tenemos email, usar email como nombre
        if (clientName === "Cliente desconocido" && clientEmail) {
          clientName = clientEmail;
        }

        // Obtener nombre del coach
        let coachName = "Sin coach";
        const coachId =
          p.coach_id || (p.client_id && clientCoachIdMap.get(p.client_id));
        if (coachId && coachMap.has(coachId)) {
          coachName = coachMap.get(coachId)!;
        }

        return {
          id: p.id,
          client_name: clientName,
          client_email: clientEmail,
          coach_name: coachName,
          amount: parseFloat(p.amount.toString()),
          date: p.date,
          status: p.status,
          method: p.method,
          receipt_url: p.receipt_url || null,
        };
      });

      setClientPayments(formattedPayments);
    } catch (error) {
      console.error("Error loading client payments:", error);
      setError("Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const loadCoachPayments = async () => {
    if (!user) return;

    try {
      const data = await getAllCoachPayments();
      setCoachPayments(data);
    } catch (error) {
      console.error("Error loading coach payments:", error);
    }
  };

  const loadCoaches = async () => {
    if (!user) return;

    try {
      const data = await getAllCoaches();
      setCoaches(data.filter((c) => c.is_approved));
    } catch (error) {
      console.error("Error loading coaches:", error);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    if (!user) return;

    try {
      setError("");
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("id", paymentId);

      if (updateError) throw updateError;
      await loadClientPayments();
    } catch (error: any) {
      setError(error.message || "Error al aprobar el pago");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!user) return;

    try {
      setError("");
      const { error: updateError } = await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", paymentId);

      if (updateError) throw updateError;
      await loadClientPayments();
    } catch (error: any) {
      setError(error.message || "Error al rechazar el pago");
    }
  };

  const handleCalculatePending = async (coachId: string) => {
    try {
      setError("");
      setLoading(true);
      const data = await calculatePendingPaymentsForCoach(coachId);
      setPendingPaymentsData(data);
      setSelectedCoach(coachId);
    } catch (error: any) {
      setError(error.message || "Error al calcular pagos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoachPayment = async () => {
    if (!user || !selectedCoach || !formData.amount) {
      setError("Completa todos los campos");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await createCoachPayment(
        selectedCoach,
        user.id,
        parseFloat(formData.amount),
        "fixed", // Por ahora fijo, se puede mejorar
        {
          notes: formData.notes,
        }
      );
      setIsCoachPaymentDialogOpen(false);
      setFormData({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      await loadCoachPayments();
    } catch (error: any) {
      setError(error.message || "Error al crear el pago");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCoachPayment = async (paymentId: string) => {
    try {
      await completeCoachPayment(paymentId);
      await loadCoachPayments();
    } catch (error: any) {
      setError(error.message || "Error al completar el pago");
    }
  };

  const handleCalculateMonthlyPayments = async () => {
    if (!user) return;

    try {
      setError("");
      setIsCalculatingMonthly(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const results = await calculateAllCoachesPaymentsForMonth(year, month);
      setMonthlyCalculations(results);
      setSelectedCoachesForBulk(new Set());
    } catch (error: any) {
      setError(error.message || "Error al calcular pagos mensuales");
      setMonthlyCalculations([]);
    } finally {
      setIsCalculatingMonthly(false);
    }
  };

  const handleToggleCoachSelection = (coachId: string) => {
    const newSet = new Set(selectedCoachesForBulk);
    if (newSet.has(coachId)) {
      newSet.delete(coachId);
    } else {
      newSet.add(coachId);
    }
    setSelectedCoachesForBulk(newSet);
  };

  const handleCreateBulkPayments = async () => {
    if (!user || selectedCoachesForBulk.size === 0) {
      setError("Selecciona al menos un coach");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const paymentsToCreate = monthlyCalculations
        .filter((summary) => selectedCoachesForBulk.has(summary.coach_id))
        .map((summary) => ({
          coachId: summary.coach_id,
          amount: summary.total_amount,
          paymentType: summary.payment_type || "fixed",
          percentageValue: summary.percentage_value || undefined,
          fixedAmount: summary.fixed_amount || undefined,
          clientPaymentIds: summary.payments.map((p) => p.clientPaymentId),
          notes: `Pago mensual - ${selectedMonth}`,
        }));

      await createBulkCoachPayments(user.id, paymentsToCreate);
      setSelectedCoachesForBulk(new Set());
      await loadCoachPayments();
      await handleCalculateMonthlyPayments(); // Recalcular para actualizar la vista
    } catch (error: any) {
      setError(error.message || "Error al crear pagos masivos");
    } finally {
      setLoading(false);
    }
  };

  const totalClientRevenue = clientPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingClientPayments = clientPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCoachPayments = coachPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const pendingCoachPayments = coachPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe: "Stripe",
      manual: "Transferencia",
      cash: "Efectivo",
    };
    return labels[method] || method;
  };

  const handleViewReceipt = (receiptUrl: string) => {
    setSelectedReceiptUrl(receiptUrl);
    setIsReceiptDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Aprueba pagos de clientes y gestiona pagos a coaches
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="client">Pagos de Clientes</TabsTrigger>
            <TabsTrigger value="coach">Pagos a Coaches</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Recaudado
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalClientRevenue.toFixed(2)} MXN
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pagos Pendientes
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${pendingClientPayments.toFixed(2)} MXN
                  </div>
                </CardContent>
              </Card>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Coach</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{payment.client_name}</span>
                            {payment.client_email && (
                              <span className="text-sm text-muted-foreground">
                                {payment.client_email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{payment.coach_name}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)} MXN</TableCell>
                        <TableCell>
                          {new Date(payment.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getMethodLabel(payment.method)}
                            </Badge>
                            {payment.method === "manual" &&
                              payment.receipt_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleViewReceipt(payment.receipt_url!)
                                  }
                                  className="h-6 w-6 p-0"
                                  title="Ver comprobante"
                                >
                                  <FileImage className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "completed"
                                ? "default"
                                : payment.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {payment.status === "completed"
                              ? "Completado"
                              : payment.status === "pending"
                              ? "Pendiente"
                              : "Fallido"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === "pending" && (
                            <div className="flex items-center justify-end gap-2">
                              {payment.method === "manual" &&
                                payment.receipt_url && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleViewReceipt(payment.receipt_url!)
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Ver Comprobante
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprovePayment(payment.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectPayment(payment.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Diálogo para ver comprobante */}
            <Dialog
              open={isReceiptDialogOpen}
              onOpenChange={setIsReceiptDialogOpen}
            >
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Comprobante de Pago</DialogTitle>
                  <DialogDescription>
                    Revisa el comprobante antes de aprobar o rechazar el pago
                  </DialogDescription>
                </DialogHeader>
                {selectedReceiptUrl && (
                  <div className="space-y-4">
                    {selectedReceiptUrl.toLowerCase().endsWith(".pdf") ? (
                      <iframe
                        src={selectedReceiptUrl}
                        className="w-full h-[600px] border rounded"
                        title="Comprobante PDF"
                      />
                    ) : (
                      <div className="flex justify-center">
                        <img
                          src={selectedReceiptUrl}
                          alt="Comprobante de pago"
                          className="max-w-full max-h-[600px] rounded border"
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(selectedReceiptUrl, "_blank")
                        }
                      >
                        Abrir en nueva pestaña
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsReceiptDialogOpen(false)}
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="coach" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Pagado a Coaches
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalCoachPayments.toFixed(2)} MXN
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pagos Pendientes
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${pendingCoachPayments.toFixed(2)} MXN
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Dialog
                open={isCoachPaymentDialogOpen}
                onOpenChange={setIsCoachPaymentDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pago a Coach
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Pago a Coach</DialogTitle>
                    <DialogDescription>
                      Registra un pago realizado a un coach
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="coach">Coach</Label>
                      <Select
                        value={selectedCoach}
                        onValueChange={setSelectedCoach}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un coach" />
                        </SelectTrigger>
                        <SelectContent>
                          {coaches.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto (MXN)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha de Pago</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.payment_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas (opcional)</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Notas adicionales"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCoachPaymentDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateCoachPayment}
                      disabled={loading}
                    >
                      {loading ? "Registrando..." : "Registrar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calcular Pendientes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Calcular Pagos Pendientes</DialogTitle>
                    <DialogDescription>
                      Selecciona un coach para calcular sus pagos pendientes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="coach_calc">Coach</Label>
                      <Select
                        value={selectedCoach}
                        onValueChange={(value) => {
                          setSelectedCoach(value);
                          handleCalculatePending(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un coach" />
                        </SelectTrigger>
                        <SelectContent>
                          {coaches.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {pendingPaymentsData && (
                      <div className="space-y-2">
                        <p className="font-medium">
                          Total Pendiente: $
                          {pendingPaymentsData.totalPending.toFixed(2)} MXN
                        </p>
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Monto Cliente</TableHead>
                                <TableHead>Monto Coach</TableHead>
                                <TableHead>Fecha</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingPaymentsData.payments.map((p: any) => (
                                <TableRow key={p.clientPaymentId}>
                                  <TableCell>{p.clientName}</TableCell>
                                  <TableCell>
                                    ${p.clientAmount.toFixed(2)} MXN
                                  </TableCell>
                                  <TableCell>
                                    ${p.coachAmount.toFixed(2)} MXN
                                  </TableCell>
                                  <TableCell>
                                    {new Date(
                                      p.paymentDate
                                    ).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Sección de cálculo mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Calcular Pagos Mensuales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="month">Mes</Label>
                    <Input
                      id="month"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCalculateMonthlyPayments}
                    disabled={isCalculatingMonthly}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isCalculatingMonthly ? "Calculando..." : "Calcular"}
                  </Button>
                </div>

                {monthlyCalculations.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {monthlyCalculations.length} coach(es) con pagos
                        pendientes
                      </p>
                      {selectedCoachesForBulk.size > 0 && (
                        <Button
                          onClick={handleCreateBulkPayments}
                          disabled={loading}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Crear {selectedCoachesForBulk.size} pago(s)
                          seleccionado(s)
                        </Button>
                      )}
                    </div>

                    <div className="border rounded-lg max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <input
                                type="checkbox"
                                checked={
                                  monthlyCalculations.length > 0 &&
                                  monthlyCalculations.every((c) =>
                                    selectedCoachesForBulk.has(c.coach_id)
                                  )
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCoachesForBulk(
                                      new Set(
                                        monthlyCalculations.map(
                                          (c) => c.coach_id
                                        )
                                      )
                                    );
                                  } else {
                                    setSelectedCoachesForBulk(new Set());
                                  }
                                }}
                                className="rounded"
                              />
                            </TableHead>
                            <TableHead>Coach</TableHead>
                            <TableHead>Configuración</TableHead>
                            <TableHead>Pagos</TableHead>
                            <TableHead>Total a Pagar</TableHead>
                            <TableHead className="text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyCalculations.map((summary) => (
                            <TableRow key={summary.coach_id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedCoachesForBulk.has(
                                    summary.coach_id
                                  )}
                                  onChange={() =>
                                    handleToggleCoachSelection(summary.coach_id)
                                  }
                                  className="rounded"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {summary.coach_name}
                              </TableCell>
                              <TableCell>
                                {summary.has_config ? (
                                  <div className="text-sm">
                                    {summary.payment_type === "percentage" ? (
                                      <Badge variant="outline">
                                        {summary.percentage_value}%
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        ${summary.fixed_amount?.toFixed(2)} fijo
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="destructive">
                                    Sin configuración
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{summary.payment_count}</TableCell>
                              <TableCell className="font-semibold">
                                ${summary.total_amount.toFixed(2)} MXN
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Eye className="h-4 w-4 mr-1" />
                                      Ver Detalles
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh]">
                                    <DialogHeader>
                                      <DialogTitle>
                                        Detalles de Pagos - {summary.coach_name}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Mes: {selectedMonth}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground">
                                            Total a Pagar
                                          </p>
                                          <p className="text-2xl font-bold">
                                            ${summary.total_amount.toFixed(2)}{" "}
                                            MXN
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">
                                            Número de Pagos
                                          </p>
                                          <p className="text-2xl font-bold">
                                            {summary.payment_count}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Cliente</TableHead>
                                              <TableHead>
                                                Monto Cliente
                                              </TableHead>
                                              <TableHead>Monto Coach</TableHead>
                                              <TableHead>Fecha</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {summary.payments.map((p) => (
                                              <TableRow key={p.clientPaymentId}>
                                                <TableCell>
                                                  {p.clientName}
                                                </TableCell>
                                                <TableCell>
                                                  ${p.clientAmount.toFixed(2)}{" "}
                                                  MXN
                                                </TableCell>
                                                <TableCell>
                                                  ${p.coachAmount.toFixed(2)}{" "}
                                                  MXN
                                                </TableCell>
                                                <TableCell>
                                                  {new Date(
                                                    p.paymentDate
                                                  ).toLocaleDateString()}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          onClick={async () => {
                                            try {
                                              setLoading(true);
                                              await createBulkCoachPayments(
                                                user!.id,
                                                [
                                                  {
                                                    coachId: summary.coach_id,
                                                    amount:
                                                      summary.total_amount,
                                                    paymentType:
                                                      summary.payment_type ||
                                                      "fixed",
                                                    percentageValue:
                                                      summary.percentage_value ||
                                                      undefined,
                                                    fixedAmount:
                                                      summary.fixed_amount ||
                                                      undefined,
                                                    clientPaymentIds:
                                                      summary.payments.map(
                                                        (p) => p.clientPaymentId
                                                      ),
                                                    notes: `Pago mensual - ${selectedMonth}`,
                                                  },
                                                ]
                                              );
                                              await loadCoachPayments();
                                              await handleCalculateMonthlyPayments();
                                            } catch (error: any) {
                                              setError(
                                                error.message ||
                                                  "Error al crear el pago"
                                              );
                                            } finally {
                                              setLoading(false);
                                            }
                                          }}
                                          disabled={
                                            loading || !summary.has_config
                                          }
                                        >
                                          {loading
                                            ? "Creando..."
                                            : "Crear Pago Individual"}
                                        </Button>
                                      </DialogFooter>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {monthlyCalculations.length === 0 &&
                  !isCalculatingMonthly &&
                  selectedMonth && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay pagos pendientes para este mes. Haz clic en
                      "Calcular" para ver los resultados.
                    </p>
                  )}
              </CardContent>
            </Card>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coach</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coachPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No hay pagos a coaches registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    coachPayments.map((payment) => {
                      const coach = coaches.find(
                        (c) => c.id === payment.coach_id
                      );
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {coach?.full_name || "Coach desconocido"}
                          </TableCell>
                          <TableCell>
                            ${parseFloat(payment.amount.toString()).toFixed(2)}{" "}
                            MXN
                          </TableCell>
                          <TableCell>
                            {payment.payment_date
                              ? new Date(
                                  payment.payment_date
                                ).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payment.status === "completed"
                                  ? "default"
                                  : payment.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {payment.status === "completed"
                                ? "Completado"
                                : payment.status === "pending"
                                ? "Pendiente"
                                : "Cancelado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleCompleteCoachPayment(payment.id)
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Completar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
