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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllCoachPayments,
  createCoachPayment,
  completeCoachPayment,
  calculatePendingPaymentsForCoach,
  type CoachPayment,
} from "@/services/coachPayments";
import { getAllCoaches } from "@/services/adminService";

interface ClientPayment {
  id: string;
  client_name: string;
  coach_name: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  method: string;
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
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  const [pendingPaymentsData, setPendingPaymentsData] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          id,
          amount,
          date,
          status,
          method,
          clients!inner (
            id,
            name,
            coach_id,
            user_profiles!clients_coach_id_fkey (
              id,
              full_name
            )
          )
        `
        )
        .order("date", { ascending: false });

      if (paymentsError) throw paymentsError;

      const formattedPayments: ClientPayment[] =
        payments?.map((p: any) => ({
          id: p.id,
          client_name: p.clients?.name || "Cliente desconocido",
          coach_name: p.clients?.user_profiles?.full_name || "Sin coach",
          amount: parseFloat(p.amount.toString()),
          date: p.date,
          status: p.status,
          method: p.method,
        })) || [];

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
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.client_name}
                        </TableCell>
                        <TableCell>{payment.coach_name}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)} MXN</TableCell>
                        <TableCell>
                          {new Date(payment.date).toLocaleDateString()}
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

