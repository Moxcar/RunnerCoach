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
import { Search, UserPlus, Link as LinkIcon } from "lucide-react";
import {
  getAllClients,
  assignClientToCoach,
  unassignClientFromCoach,
  getAllCoaches,
  type Client,
  type Coach,
} from "@/services/adminService";
import {
  generateRegistrationLink,
  getRegistrationUrl,
} from "@/services/registrationLinks";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCoachForLink, setSelectedCoachForLink] = useState<string>("");
  const [formData, setFormData] = useState({
    coach_id: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadClients();
      loadCoaches();
    }
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getAllClients();
      setClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
      setError("Error al cargar los clientes");
    } finally {
      setLoading(false);
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

  const handleAssignCoach = async () => {
    if (!user || !selectedClient || !formData.coach_id) {
      setError("Selecciona un coach");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await assignClientToCoach(selectedClient.id, formData.coach_id, user.id);
      setIsAssignDialogOpen(false);
      setSelectedClient(null);
      setFormData({ coach_id: "" });
      await loadClients();
    } catch (error: any) {
      setError(error.message || "Error al asignar el coach");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignCoach = async (clientId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres remover la asignación de este cliente?"
      )
    ) {
      return;
    }

    try {
      await unassignClientFromCoach(clientId);
      await loadClients();
    } catch (error: any) {
      setError(error.message || "Error al remover la asignación");
    }
  };

  const handleGenerateLink = async () => {
    if (!user || !selectedCoachForLink) {
      setError("Selecciona un coach");
      return;
    }

    try {
      setError("");
      const link = await generateRegistrationLink(
        selectedCoachForLink,
        user.id
      );
      const url = getRegistrationUrl(link.token);
      setRegistrationLink(url);
      navigator.clipboard.writeText(url);
    } catch (error: any) {
      setError(error.message || "Error al generar el enlace");
    }
  };

  const getCoachName = (coachId: string | null) => {
    if (!coachId) return "Sin asignar";
    const coach = coaches.find((c) => c.id === coachId);
    return coach?.full_name || "Coach desconocido";
  };

  const filteredClients = clients.filter((client) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "with_coach" && client.coach_id) ||
      (filter === "without_coach" && !client.coach_id) ||
      client.payment_status === filter;
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground">
              Asigna clientes a coaches y gestiona sus relaciones
            </p>
          </div>
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <LinkIcon className="h-4 w-4 mr-2" />
                Generar Enlace de Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generar Enlace de Registro</DialogTitle>
                <DialogDescription>
                  Genera un enlace que asignará automáticamente nuevos clientes
                  al coach seleccionado
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
                    value={selectedCoachForLink}
                    onValueChange={setSelectedCoachForLink}
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
                {registrationLink && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">
                      Enlace generado (copiado al portapapeles):
                    </p>
                    <p className="text-sm text-muted-foreground break-all">
                      {registrationLink}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsLinkDialogOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleGenerateLink}
                  disabled={loading || !selectedCoachForLink}
                >
                  {loading ? "Generando..." : "Generar Enlace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with_coach">Con Coach</SelectItem>
              <SelectItem value="without_coach">Sin Coach</SelectItem>
              <SelectItem value="active">Pago Activo</SelectItem>
              <SelectItem value="pending">Pago Pendiente</SelectItem>
              <SelectItem value="overdue">Pago Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {loading && clients.length === 0 ? (
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
                  <TableHead>Coach Asignado</TableHead>
                  <TableHead>Plan Activo</TableHead>
                  <TableHead>Estado de Pago</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>
                        {client.coach_id ? (
                          <Badge>{getCoachName(client.coach_id)}</Badge>
                        ) : (
                          <Badge variant="outline">Sin asignar</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.plans ? (
                          <Badge variant="secondary">{client.plans.name}</Badge>
                        ) : (
                          <Badge variant="outline">Sin plan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            client.payment_status === "active"
                              ? "default"
                              : client.payment_status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {client.payment_status === "active"
                            ? "Activo"
                            : client.payment_status === "pending"
                            ? "Pendiente"
                            : "Vencido"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              setFormData({ coach_id: client.coach_id || "" });
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {client.coach_id ? "Cambiar" : "Asignar"}
                          </Button>
                          {client.coach_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassignCoach(client.id)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de asignación */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedClient
                  ? `Asignar Coach - ${selectedClient.name}`
                  : "Asignar Coach"}
              </DialogTitle>
              <DialogDescription>
                Selecciona el coach al que quieres asignar este cliente
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
                  value={formData.coach_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, coach_id: value })
                  }
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssignCoach}
                disabled={loading || !formData.coach_id}
              >
                {loading ? "Asignando..." : "Asignar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
