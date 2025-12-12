import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, Check, X, Settings } from "lucide-react";
import {
  getAllCoaches,
  approveCoach,
  rejectCoach,
  type Coach,
} from "@/services/adminService";
import {
  getCoachPaymentConfig,
  setCoachPaymentConfig,
  type CoachPaymentConfig,
} from "@/services/coachPayments";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateRegistrationLink,
  generateCoachRegistrationLink,
  getRegistrationUrl,
} from "@/services/registrationLinks";

export default function AdminCoaches() {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isPaymentConfigDialogOpen, setIsPaymentConfigDialogOpen] =
    useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<CoachPaymentConfig | null>(
    null
  );
  const [paymentFormData, setPaymentFormData] = useState({
    payment_type: "percentage" as "percentage" | "fixed",
    percentage_value: "",
    fixed_amount: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCoaches();
    }
  }, [user]);

  const loadCoaches = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getAllCoaches();
      setCoaches(data);
    } catch (error) {
      console.error("Error loading coaches:", error);
      setError("Error al cargar los coaches");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCoach = async (coachId: string) => {
    try {
      await approveCoach(coachId);
      await loadCoaches();
    } catch (error: any) {
      setError(error.message || "Error al aprobar el coach");
    }
  };

  const handleRejectCoach = async (coachId: string) => {
    try {
      await rejectCoach(coachId);
      await loadCoaches();
    } catch (error: any) {
      setError(error.message || "Error al rechazar el coach");
    }
  };

  const handleOpenPaymentConfig = async (coach: Coach) => {
    setSelectedCoach(coach);
    try {
      const config = await getCoachPaymentConfig(coach.id);
      setPaymentConfig(config);
      if (config) {
        setPaymentFormData({
          payment_type: config.payment_type,
          percentage_value: config.percentage_value?.toString() || "",
          fixed_amount: config.fixed_amount?.toString() || "",
        });
      } else {
        setPaymentFormData({
          payment_type: "percentage",
          percentage_value: "",
          fixed_amount: "",
        });
      }
      setIsPaymentConfigDialogOpen(true);
    } catch (error: any) {
      setError(error.message || "Error al cargar la configuración");
    }
  };

  const handleSavePaymentConfig = async () => {
    if (!user || !selectedCoach) return;

    if (
      paymentFormData.payment_type === "percentage" &&
      (!paymentFormData.percentage_value ||
        parseFloat(paymentFormData.percentage_value) <= 0 ||
        parseFloat(paymentFormData.percentage_value) > 100)
    ) {
      setError("El porcentaje debe estar entre 0 y 100");
      return;
    }

    if (
      paymentFormData.payment_type === "fixed" &&
      (!paymentFormData.fixed_amount ||
        parseFloat(paymentFormData.fixed_amount) <= 0)
    ) {
      setError("La cantidad fija debe ser mayor a 0");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await setCoachPaymentConfig(
        selectedCoach.id,
        {
          payment_type: paymentFormData.payment_type,
          percentage_value:
            paymentFormData.payment_type === "percentage"
              ? parseFloat(paymentFormData.percentage_value)
              : undefined,
          fixed_amount:
            paymentFormData.payment_type === "fixed"
              ? parseFloat(paymentFormData.fixed_amount)
              : undefined,
        },
        user.id
      );
      setIsPaymentConfigDialogOpen(false);
      setSelectedCoach(null);
      await loadCoaches();
    } catch (error: any) {
      setError(error.message || "Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRegistrationLink = async (coachId: string) => {
    if (!user) return;

    try {
      const link = await generateRegistrationLink(coachId, user.id);
      const url = getRegistrationUrl(link.token);
      navigator.clipboard.writeText(url);
      alert(`Enlace copiado al portapapeles:\n${url}`);
    } catch (error: any) {
      setError(error.message || "Error al generar el enlace");
    }
  };

  const handleGenerateCoachRegistrationLink = async () => {
    if (!user) return;

    try {
      const link = await generateCoachRegistrationLink(user.id);
      const url = getRegistrationUrl(link.token);
      navigator.clipboard.writeText(url);
      alert(
        `Enlace de registro para coach copiado al portapapeles:\n${url}\n\nEste enlace permite que alguien se registre como coach pendiente de aprobación.`
      );
    } catch (error: any) {
      setError(error.message || "Error al generar el enlace de coach");
    }
  };

  const filteredCoaches = coaches.filter((coach) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "approved" && coach.is_approved) ||
      (filter === "pending" && !coach.is_approved);
    const matchesSearch =
      coach.full_name.toLowerCase().includes(search.toLowerCase()) ||
      coach.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Coaches</h1>
            <p className="text-muted-foreground">
              Invita, aprueba y gestiona los coaches de la plataforma
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerateCoachRegistrationLink}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generar Enlace de Coach
            </Button>
            <div className="text-sm text-muted-foreground">
              Genera enlaces de registro para nuevos coaches
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar coaches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {loading && coaches.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No se encontraron coaches
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell className="font-medium">
                        {coach.full_name}
                      </TableCell>
                      <TableCell>{coach.email || "-"}</TableCell>
                      <TableCell>
                        {coach.is_approved ? (
                          <Badge className="bg-green-500">Aprobado</Badge>
                        ) : (
                          <Badge variant="destructive">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(coach.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!coach.is_approved && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveCoach(coach.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectCoach(coach.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rechazar
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPaymentConfig(coach)}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Pagos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleGenerateRegistrationLink(coach.id)
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Enlace
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de configuración de pagos */}
        <Dialog
          open={isPaymentConfigDialogOpen}
          onOpenChange={setIsPaymentConfigDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Configuración de Pagos - {selectedCoach?.full_name}
              </DialogTitle>
              <DialogDescription>
                Configura cómo se calcularán los pagos para este coach
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Tipo de Pago</Label>
                <Select
                  value={paymentFormData.payment_type}
                  onValueChange={(value: "percentage" | "fixed") =>
                    setPaymentFormData({
                      ...paymentFormData,
                      payment_type: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      Porcentaje del pago del cliente
                    </SelectItem>
                    <SelectItem value="fixed">
                      Cantidad fija por cliente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentFormData.payment_type === "percentage" ? (
                <div className="space-y-2">
                  <Label htmlFor="percentage">Porcentaje (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={paymentFormData.percentage_value}
                    onChange={(e) =>
                      setPaymentFormData({
                        ...paymentFormData,
                        percentage_value: e.target.value,
                      })
                    }
                    placeholder="Ej: 30"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fixed">Cantidad Fija (MXN)</Label>
                  <Input
                    id="fixed"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentFormData.fixed_amount}
                    onChange={(e) =>
                      setPaymentFormData({
                        ...paymentFormData,
                        fixed_amount: e.target.value,
                      })
                    }
                    placeholder="Ej: 50"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPaymentConfigDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSavePaymentConfig} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
