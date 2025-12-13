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
import { Plus, Search, Link as LinkIcon, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateRegistrationLink,
  getRegistrationUrl,
  getCoachRegistrationLinks,
  type RegistrationLink,
} from "@/services/registrationLinks";
import { Badge } from "@/components/ui/badge";

interface Plan {
  id: string;
  name: string;
  cost: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  payment_status: "active" | "pending" | "overdue";
  notes: string | null;
  plan_id: string | null;
  plans: Plan | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    payment_status: "pending" as Client["payment_status"],
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationLinks, setRegistrationLinks] = useState<
    RegistrationLink[]
  >([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadClients();
      loadRegistrationLinks();
    }
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(
          "id, name, email, phone, payment_status, notes, plan_id, plans(id, name, cost)"
        )
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      if (clientsData) {
        setClients(clientsData as Client[]);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      setError("Error al cargar los clientes");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!user) return;

    if (!formData.name || !formData.email) {
      setError("El nombre y el email son obligatorios");
      return;
    }

    try {
      setError("");
      setLoading(true);

      // Buscar si el usuario ya existe por email
      // Nota: No podemos crear usuarios desde el cliente, solo podemos asociar usuarios existentes
      // El cliente debe registrarse primero a través de la página de registro

      // Buscar usuario por email en user_profiles (a través de auth.users)
      // Como no podemos acceder directamente a auth.users desde el cliente,
      // intentaremos buscar si ya existe un cliente con ese email
      const { data: existingClients, error: checkError } = await supabase
        .from("clients")
        .select("email")
        .eq("email", formData.email)
        .eq("coach_id", user.id)
        .limit(1);

      if (checkError) {
        console.error("Error checking existing client:", checkError);
      }

      if (existingClients && existingClients.length > 0) {
        setError("Ya existe un cliente con ese email");
        setLoading(false);
        return;
      }

      // Por ahora, solo podemos agregar información de contacto
      // El cliente deberá registrarse primero y luego se asociará automáticamente
      // o el coach puede agregar manualmente después de que el cliente se registre
      setError(
        "Para agregar un cliente, el usuario debe registrarse primero en la plataforma. Una vez registrado, se asociará automáticamente con su coach. Por ahora, puedes agregar información de contacto temporal."
      );

      // Opcional: Guardar información temporal en una tabla separada o en notas
      // Por ahora, solo mostramos el mensaje
      setLoading(false);

      // TODO: Implementar sistema de invitaciones o esperar a que el cliente se registre
    } catch (error: any) {
      console.error("Error adding client:", error);
      setError(error.message || "Error al agregar el cliente");
      setLoading(false);
    }
  };

  const loadRegistrationLinks = async () => {
    if (!user) return;

    try {
      const links = await getCoachRegistrationLinks(user.id);
      setRegistrationLinks(links);
    } catch (error) {
      console.error("Error loading registration links:", error);
    }
  };

  const handleGenerateLink = async () => {
    if (!user) return;

    try {
      setError("");
      const link = await generateRegistrationLink(user.id, user.id);
      const url = getRegistrationUrl(link.token);
      setNewLink(url);
      navigator.clipboard.writeText(url);
      await loadRegistrationLinks();
    } catch (error: any) {
      setError(error.message || "Error al generar el enlace");
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Enlace copiado al portapapeles");
  };

  const filteredClients = clients.filter((client) => {
    const matchesFilter = filter === "all" || client.payment_status === filter;
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: Client["payment_status"]) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
    };
    const labels = {
      active: "Activo",
      pending: "Pendiente",
      overdue: "Vencido",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="w-full sm:max-w-sm">
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
          <div className="flex flex-wrap gap-2">
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <LinkIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Enlaces de Registro</span>
                  <span className="sm:hidden">Enlaces</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enlaces de Registro</DialogTitle>
                  <DialogDescription>
                    Genera enlaces para que nuevos clientes se registren y se
                    asignen automáticamente a ti
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <Button onClick={handleGenerateLink} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Generar Nuevo Enlace
                  </Button>
                  {newLink && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">
                        Nuevo enlace generado (copiado al portapapeles):
                      </p>
                      <p className="text-sm text-muted-foreground break-all">
                        {newLink}
                      </p>
                    </div>
                  )}
                  {registrationLinks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Enlaces existentes:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {registrationLinks.map((link) => {
                          const url = getRegistrationUrl(link.token);
                          const isExpired =
                            link.expires_at &&
                            new Date(link.expires_at) < new Date();
                          return (
                            <div
                              key={link.id}
                              className="p-3 border rounded-md flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <p className="text-sm break-all">{url}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge
                                    variant={
                                      link.is_active && !isExpired
                                        ? "default"
                                        : "destructive"
                                    }
                                  >
                                    {link.is_active && !isExpired
                                      ? "Activo"
                                      : "Inactivo"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Usado: {link.used_count} veces
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyLink(url)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
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
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Agregar cliente</span>
                  <span className="sm:hidden">Agregar</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar nuevo cliente</DialogTitle>
                  <DialogDescription>
                    Completa la información del cliente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado de pago</Label>
                    <Select
                      value={formData.payment_status}
                      onValueChange={(value: Client["payment_status"]) =>
                        setFormData({ ...formData, payment_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setError("");
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddClient} disabled={loading}>
                    {loading ? "Agregando..." : "Agregar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
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
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>
                        {client.plans ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit">
                              {client.plans.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              €{client.plans.cost.toFixed(2)}/mes
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Sin plan
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(client.payment_status)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {client.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
