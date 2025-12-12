import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Calendar,
  MapPin,
  Upload,
  X,
  Edit,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getEventUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  image_url: string | null;
  price: number;
  registered_clients: number;
  max_capacity: number | null;
  slug?: string | null;
}

interface EventRegistration {
  id: string;
  event_id: string;
  client_id: string | null;
  user_id: string | null;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_profile?: {
    id: string;
    full_name: string | null;
  } | null;
  client_email?: string | null;
}

export default function Events() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    price: "0",
    max_capacity: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRegistrationsDialogOpen, setIsRegistrationsDialogOpen] =
    useState(false);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // Contar inscripciones por evento
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            registered_clients: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts as Event[]);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type, // Asegurar que el Content-Type sea correcto
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);

        // Errores específicos con mensajes descriptivos
        if (
          uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("The resource was not found") ||
          uploadError.statusCode === 404
        ) {
          throw new Error(
            "El bucket 'event-images' no está configurado. Ve a Storage en Supabase y crea el bucket 'event-images' como público."
          );
        }
        if (
          uploadError.message.includes("new row violates row-level security") ||
          uploadError.statusCode === 403
        ) {
          throw new Error(
            "No tienes permisos para subir imágenes. Verifica que:\n1. Tu usuario tiene rol 'coach' en user_profiles\n2. Las políticas de Storage están configuradas correctamente"
          );
        }
        if (uploadError.statusCode === 400) {
          throw new Error(
            `Error al subir la imagen: ${uploadError.message}. Verifica que el bucket existe y las políticas están configuradas.`
          );
        }
        throw new Error(
          `Error al subir la imagen: ${
            uploadError.message || "Error desconocido"
          }`
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setError("Por favor, sube una imagen (JPG, PNG, WEBP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande. Máximo 5MB");
        return;
      }
      setImageFile(file);
      setError("");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      location: "",
      description: "",
      price: "0",
      max_capacity: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingEvent(null);
    setError("");
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date.split("T")[0],
      location: event.location || "",
      description: event.description || "",
      price: event.price.toString(),
      max_capacity: event.max_capacity?.toString() || "",
    });
    setImagePreview(event.image_url || null);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleAddEvent = async () => {
    if (!user) {
      setError("No estás autenticado");
      return;
    }

    if (!formData.name || !formData.date) {
      setError("Por favor, completa todos los campos requeridos");
      return;
    }

    // Validar que max_capacity sea mayor que los inscritos si se establece
    if (editingEvent && formData.max_capacity) {
      const maxCapacity = parseInt(formData.max_capacity);
      if (maxCapacity < editingEvent.registered_clients) {
        setError(
          `El cupo máximo no puede ser menor que los inscritos actuales (${editingEvent.registered_clients})`
        );
        return;
      }
    }

    setError("");
    setUploading(true);

    try {
      // Intentar subir la imagen primero (si existe), pero no bloquear si falla
      let imageUrl: string | null = editingEvent?.image_url || null;

      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (imageError: any) {
          console.warn(
            "Error al subir imagen, continuando sin imagen:",
            imageError
          );
          // Continuar sin imagen en lugar de fallar completamente
          imageUrl = editingEvent?.image_url || null;
        }
      }

      const eventData = {
        name: formData.name,
        date: formData.date,
        location: formData.location || null,
        description: formData.description || null,
        image_url: imageUrl,
        price: parseFloat(formData.price) || 0,
        max_capacity: formData.max_capacity
          ? parseInt(formData.max_capacity)
          : null,
      };

      if (editingEvent) {
        // Actualizar evento existente
        const { error: updateError } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (updateError) {
          console.error("Update error details:", updateError);
          let errorMessage = updateError.message;
          if (
            updateError.code === "42501" ||
            updateError.message.includes("row-level security")
          ) {
            errorMessage =
              "No tienes permisos para editar eventos. Verifica que tu cuenta sea de tipo 'coach'.";
          }
          throw new Error(errorMessage);
        }
      } else {
        // Insertar nuevo evento
        const { error: insertError } = await supabase
          .from("events")
          .insert(eventData)
          .select();

        if (insertError) {
          console.error("Insert error details:", insertError);
          console.error("User ID:", user.id);
          console.error("User email:", user.email);

          let errorMessage = insertError.message;
          if (
            insertError.code === "42501" ||
            insertError.message.includes("row-level security")
          ) {
            errorMessage =
              "No tienes permisos para crear eventos. Verifica que tu cuenta sea de tipo 'coach'.";
          }

          throw new Error(errorMessage);
        }
      }

      // Si llegamos aquí, el evento se creó/actualizó exitosamente
      setIsDialogOpen(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      console.error(
        `Error ${editingEvent ? "updating" : "creating"} event:`,
        error
      );
      setError(
        error.message ||
          `Error al ${editingEvent ? "actualizar" : "crear"} el evento`
      );
    } finally {
      setUploading(false);
    }
  };

  const loadEventRegistrations = async (eventId: string) => {
    if (!user) return;

    setLoadingRegistrations(true);
    try {
      // Obtener registros sin status (se maneja en el frontend)
      const { data: registrationsData, error: registrationsError } =
        await supabase
          .from("event_registrations")
          .select("id, event_id, client_id, user_id, email, created_at")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false });

      if (registrationsError) throw registrationsError;

      // Obtener todos los IDs únicos necesarios
      const userIds = [
        ...new Set(
          (registrationsData || []).map((r: any) => r.user_id).filter(Boolean)
        ),
      ];
      const clientIds = [
        ...new Set(
          (registrationsData || []).map((r: any) => r.client_id).filter(Boolean)
        ),
      ];

      // Obtener nombres desde user_profiles
      const userProfileMap = new Map<string, { full_name: string | null }>();
      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (userProfiles) {
          userProfiles.forEach((profile: any) => {
            userProfileMap.set(profile.id, {
              full_name: profile.full_name,
            });
          });
        }
      }

      // Obtener user_ids y emails desde clients
      const clientToUserIdMap = new Map<string, string>();
      const clientEmailMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, user_id, email")
          .in("id", clientIds);

        if (clients) {
          clients.forEach((client: any) => {
            if (client.user_id) {
              clientToUserIdMap.set(client.id, client.user_id);
            }
            if (client.email) {
              clientEmailMap.set(client.id, client.email);
            }
          });
        }
      }

      // Obtener nombres de clientes que tienen client_id pero no user_id directo
      const clientUserIds = Array.from(clientToUserIdMap.values());
      if (clientUserIds.length > 0) {
        const { data: clientUserProfiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", clientUserIds);

        if (clientUserProfiles) {
          clientUserProfiles.forEach((profile: any) => {
            if (!userProfileMap.has(profile.id)) {
              userProfileMap.set(profile.id, {
                full_name: profile.full_name,
              });
            }
          });
        }
      }

      // Formatear los registros
      const transformedData = (registrationsData || []).map((reg: any) => {
        let userProfile = null;
        let clientEmail = null;

        // Obtener nombre desde user_profiles
        if (reg.user_id && userProfileMap.has(reg.user_id)) {
          userProfile = userProfileMap.get(reg.user_id)!;
        } else if (reg.client_id && clientToUserIdMap.has(reg.client_id)) {
          const userId = clientToUserIdMap.get(reg.client_id)!;
          if (userProfileMap.has(userId)) {
            userProfile = userProfileMap.get(userId)!;
          }
        }

        // Obtener email desde clients o del registro
        if (reg.client_id && clientEmailMap.has(reg.client_id)) {
          clientEmail = clientEmailMap.get(reg.client_id)!;
        } else if (reg.email) {
          clientEmail = reg.email;
        }

        return {
          id: reg.id,
          event_id: reg.event_id,
          client_id: reg.client_id,
          user_id: reg.user_id,
          email: reg.email,
          status: "pending" as const, // Status manejado solo en frontend
          created_at: reg.created_at,
          user_profile: userProfile,
          client_email: clientEmail,
        };
      });

      setRegistrations(transformedData);
    } catch (error: any) {
      console.error("Error loading registrations:", error);
      setError(error.message || "Error al cargar las inscripciones");
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleViewRegistrations = (event: Event) => {
    setSelectedEvent(event);
    setIsRegistrationsDialogOpen(true);
    loadEventRegistrations(event.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobado
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) >= new Date()
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar evento" : "Crear nuevo evento"}
                </DialogTitle>
                <DialogDescription>
                  {editingEvent
                    ? "Modifica la información del evento"
                    : "Completa la información del evento"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del evento *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha *</Label>
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
                  <Label htmlFor="location">Lugar</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (0 para evento gratis)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">
                    Cupo máximo (opcional, dejar vacío para sin límite)
                  </Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min="1"
                    value={formData.max_capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_capacity: e.target.value,
                      })
                    }
                    placeholder="Sin límite"
                  />
                  {editingEvent && formData.max_capacity && (
                    <p className="text-xs text-muted-foreground">
                      Inscritos actuales: {editingEvent.registered_clients}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Imagen del evento</Label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-md p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <Label
                        htmlFor="image"
                        className="cursor-pointer text-sm text-muted-foreground"
                      >
                        Haz clic para subir una imagen
                      </Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={uploading}>
                  {uploading
                    ? editingEvent
                      ? "Actualizando..."
                      : "Creando..."
                    : editingEvent
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
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
                      <span>
                        {format(new Date(event.date), "dd MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
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
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Inscritos
                        </span>
                        <span className="font-semibold">
                          {event.registered_clients} clientes
                        </span>
                      </div>
                      {event.max_capacity && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Cupo máximo
                          </span>
                          <span
                            className={`font-semibold ${
                              event.registered_clients >= event.max_capacity
                                ? "text-red-600"
                                : event.registered_clients >=
                                  event.max_capacity * 0.8
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            {event.registered_clients} / {event.max_capacity}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(getEventUrl(event))}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewRegistrations(event)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Ver inscritos ({event.registered_clients})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Todos los eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Lugar</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Inscritos</TableHead>
                    <TableHead>Cupo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay eventos creados
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(event.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{event.location || "-"}</TableCell>
                        <TableCell>
                          {event.price === 0 ? (
                            <span className="text-green-600">Gratis</span>
                          ) : (
                            `$${event.price.toLocaleString()} MXN`
                          )}
                        </TableCell>
                        <TableCell>{event.registered_clients}</TableCell>
                        <TableCell>
                          {event.max_capacity ? (
                            <span
                              className={
                                event.registered_clients >= event.max_capacity
                                  ? "text-red-600 font-semibold"
                                  : event.registered_clients >=
                                    event.max_capacity * 0.8
                                  ? "text-orange-600"
                                  : "text-muted-foreground"
                              }
                            >
                              {event.registered_clients} / {event.max_capacity}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Sin límite
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Diálogo de inscripciones */}
        <Dialog
          open={isRegistrationsDialogOpen}
          onOpenChange={setIsRegistrationsDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Inscripciones - {selectedEvent?.name}</DialogTitle>
              <DialogDescription>
                Gestiona las inscripciones de tus alumnos a este evento
              </DialogDescription>
            </DialogHeader>
            {loadingRegistrations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e9540d]"></div>
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay inscripciones para este evento
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Fecha de inscripción</TableHead>
                      <TableHead>Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((registration) => {
                      const clientName =
                        registration.user_profile?.full_name ||
                        registration.email ||
                        "Sin nombre";
                      const clientEmail =
                        registration.client_email || registration.email || "";

                      return (
                        <TableRow key={registration.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{clientName}</span>
                              {clientEmail && (
                                <span className="text-sm text-muted-foreground">
                                  {clientEmail}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{clientEmail || "-"}</TableCell>
                          <TableCell>
                            {format(
                              new Date(registration.created_at),
                              "dd MMM yyyy"
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(registration.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRegistrationsDialogOpen(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
