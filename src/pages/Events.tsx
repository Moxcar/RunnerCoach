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
import { Plus, Calendar, MapPin, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  image_url: string | null;
  price: number;
  registered_clients: number;
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    price: "0",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
        .eq("coach_id", user.id)
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

  const handleAddEvent = async () => {
    if (!user) {
      setError("No estás autenticado");
      return;
    }

    if (!formData.name || !formData.date) {
      setError("Por favor, completa todos los campos requeridos");
      return;
    }

    setError("");
    setUploading(true);

    try {
      // Intentar subir la imagen primero (si existe), pero no bloquear si falla
      let imageUrl: string | null = null;

      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile, user.id);
        } catch (imageError: any) {
          console.warn(
            "Error al subir imagen, continuando sin imagen:",
            imageError
          );
          // Continuar sin imagen en lugar de fallar completamente
          imageUrl = null;
        }
      }

      // Insertar el evento directamente sin verificar el perfil primero
      // La política RLS se encargará de la verificación
      const { error: insertError } = await supabase
        .from("events")
        .insert({
          coach_id: user.id,
          name: formData.name,
          date: formData.date,
          location: formData.location || null,
          description: formData.description || null,
          image_url: imageUrl,
          price: parseFloat(formData.price) || 0,
        })
        .select();

      if (insertError) {
        console.error("Insert error details:", insertError);
        console.error("User ID:", user.id);
        console.error("User email:", user.email);

        // Mensaje de error más descriptivo
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

      // Si llegamos aquí, el evento se creó exitosamente
      setIsDialogOpen(false);
      setFormData({
        name: "",
        date: "",
        location: "",
        description: "",
        price: "0",
      });
      setImageFile(null);
      setImagePreview(null);
      setError("");
      loadEvents();
    } catch (error: any) {
      console.error("Error creating event:", error);
      setError(error.message || "Error al crear el evento");
    } finally {
      setUploading(false);
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo evento</DialogTitle>
                <DialogDescription>
                  Completa la información del evento
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
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
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
                    setImageFile(null);
                    setImagePreview(null);
                    setError("");
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddEvent} disabled={uploading}>
                  {uploading ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
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
                  <CardTitle>{event.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(event.date), "dd MMMM yyyy")}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {event.price === 0 ? (
                        <span className="text-green-600">Gratis</span>
                      ) : (
                        `$${event.price.toLocaleString()}`
                      )}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Inscritos
                      </span>
                      <span className="font-semibold">
                        {event.registered_clients} clientes
                      </span>
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      Ver inscritos
                    </Button>
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
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
                            `$${event.price.toLocaleString()}`
                          )}
                        </TableCell>
                        <TableCell>{event.registered_clients}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
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
      </div>
    </DashboardLayout>
  );
}
