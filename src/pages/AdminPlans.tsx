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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";

interface Plan {
  id: string;
  name: string;
  cost: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    features: "",
    is_active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans")
        .select("*")
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

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        cost: plan.cost.toString(),
        features: plan.features.join("\n"),
        is_active: plan.is_active,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        cost: "",
        features: "",
        is_active: true,
      });
    }
    setError("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    setFormData({
      name: "",
      cost: "",
      features: "",
      is_active: true,
    });
    setError("");
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.name || !formData.cost) {
      setError("El nombre y el costo son obligatorios");
      return;
    }

    const cost = parseFloat(formData.cost);
    if (isNaN(cost) || cost < 0) {
      setError("El costo debe ser un número válido");
      return;
    }

    const features = formData.features
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    try {
      setError("");
      setLoading(true);

      if (editingPlan) {
        const { error } = await supabase
          .from("plans")
          .update({
            name: formData.name,
            cost: cost,
            features: features,
            is_active: formData.is_active,
          })
          .eq("id", editingPlan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert({
          name: formData.name,
          cost: cost,
          features: features,
          is_active: formData.is_active,
          created_by: user.id,
        });

        if (error) throw error;
      }

      await loadPlans();
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      setError(error.message || "Error al guardar el plan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este plan?")) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("plans").delete().eq("id", planId);

      if (error) throw error;
      await loadPlans();
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      setError(error.message || "Error al eliminar el plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gestión de Planes
            </h1>
            <p className="text-muted-foreground mt-2">
              Crea y gestiona los planes de suscripción disponibles para los
              clientes
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? "Editar Plan" : "Nuevo Plan"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlan
                    ? "Modifica los detalles del plan"
                    : "Crea un nuevo plan de suscripción"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Plan</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Plan Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo Mensual (MXN)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="Ej: 99.99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features">
                    Características (una por línea)
                  </Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) =>
                      setFormData({ ...formData, features: e.target.value })
                    }
                    placeholder="Seguimiento personalizado
Acceso a eventos
Soporte 24/7"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Escribe cada característica en una línea separada
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Plan activo (visible en la landing page)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading
                    ? "Guardando..."
                    : editingPlan
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="border rounded-lg backdrop-blur-xl bg-card/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Características</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Cargando planes...
                    </TableCell>
                  </TableRow>
                ) : plans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay planes creados. Crea tu primer plan para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          ${plan.cost.toFixed(2)} MXN
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          /mes
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {plan.features.slice(0, 3).map((feature, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {feature}
                            </Badge>
                          ))}
                          {plan.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{plan.features.length - 3} más
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {plan.is_active ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
