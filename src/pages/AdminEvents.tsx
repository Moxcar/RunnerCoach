import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  MapPin,
  Upload,
  X,
  Edit,
  Users,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getAllCoaches } from "@/services/adminService";

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
  coach_id: string;
  coach_name: string;
}

export default function AdminEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    price: "0",
    max_capacity: "",
    coach_id: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadEvents();
      loadCoaches();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          `
          *,
          user_profiles!events_coach_id_fkey (
            id,
            full_name
          )
        `
        )
        .order("date", { ascending: true });

      if (eventsError) throw eventsError;

      // Contar inscripciones por evento
      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          const { count } = await supabase
            .from("event_registrations")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            registered_clients: count || 0,
            coach_name: event.user_profiles?.full_name || "Coach desconocido",
          };
        })
      );

      setEvents(eventsWithCounts as Event[]);
    } catch (error) {
      console.error("Error loading events:", error);
      setError("Error al cargar los eventos");
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

  const uploadImage = async (file: File, userId: string): Promise<string> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `events/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date,
      location: event.location,
      description: event.description,
      price: event.price.toString(),
      max_capacity: event.max_capacity?.toString() || "",
      coach_id: event.coach_id,
    });
    setImagePreview(event.image_url);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      date: "",
      location: "",
      description: "",
      price: "0",
      max_capacity: "",
      coach_id: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingEvent(null);
    setError("");
  };

  const handleAddEvent = async () => {
    if (!user) {
      setError("No estás autenticado");
      return;
    }

    if (!formData.name || !formData.date || !formData.location) {
      setError("El nombre, fecha y ubicación son obligatorios");
      return;
    }

    if (!formData.coach_id) {
      setError("Debes seleccionar un coach");
      return;
    }

    try {
      setError("");
      setUploading(true);

      let imageUrl = imagePreview;

      if (imageFile && !imagePreview) {
        imageUrl = await uploadImage(imageFile, formData.coach_id);
      }

      const eventData = {
        coach_id: formData.coach_id,
        name: formData.name,
        date: formData.date,
        location: formData.location,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        image_url: imageUrl,
        max_capacity: formData.max_capacity
          ? parseInt(formData.max_capacity)
          : null,
      };

      if (editingEvent) {
        const { error: updateError } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("events")
          .insert(eventData)
          .select();

        if (insertError) throw insertError;
      }

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

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este evento?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
      loadEvents();
    } catch (error: any) {
      setError(error.message || "Error al eliminar el evento");
    }
  };

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) >= new Date()
  );
  const pastEvents = events.filter(
    (event) => new Date(event.date) < new Date()
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
            <p className="text-muted-foreground">
              Crea y gestiona eventos de todos los coaches
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? "Editar Evento" : "Crear Nuevo Evento"}
                </DialogTitle>
                <DialogDescription>
                  {editingEvent
                    ? "Modifica los detalles del evento"
                    : "Completa la información para crear un nuevo evento"}
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
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Evento</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Maratón de Madrid 2024"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="price">Precio (MXN)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Ej: Parque del Retiro, Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Cupo Máximo (opcional)</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, max_capacity: e.target.value })
                    }
                    placeholder="Sin límite"
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
                    placeholder="Descripción del evento..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Imagen del Evento</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setImagePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {imagePreview && (
                    <div className="relative mt-2">
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
                          setImagePreview(null);
                          setImageFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={uploading}>
                  {uploading
                    ? "Guardando..."
                    : editingEvent
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Próximos Eventos</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <Card key={event.id}>
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <CardHeader>
                      <CardTitle>{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(event.date), "PPP")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {event.registered_clients}
                            {event.max_capacity
                              ? ` / ${event.max_capacity}`
                              : ""}{" "}
                            inscritos
                          </span>
                        </div>
                        <div>
                          <Badge>Coach: {event.coach_name}</Badge>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Eventos Pasados</h2>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Inscritos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.name}
                        </TableCell>
                        <TableCell>{event.coach_name}</TableCell>
                        <TableCell>
                          {format(new Date(event.date), "PPP")}
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>
                          {event.registered_clients}
                          {event.max_capacity ? ` / ${event.max_capacity}` : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No hay eventos registrados
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

