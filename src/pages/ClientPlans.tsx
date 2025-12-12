import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
  Package,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
  id: string;
  name: string;
  cost: number;
  features: string[];
  is_active: boolean;
}

interface ClientPlan {
  plan_id: string | null;
  plan: Plan | null;
}

export default function ClientPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ClientPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPlans();
      loadCurrentPlan();
    }
  }, [user]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
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

  const loadCurrentPlan = async () => {
    if (!user) return;

    try {
      // Obtener el cliente asociado
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, plan_id, plans(*)")
        .eq("user_id", user.id)
        .single();

      if (clientError && clientError.code !== "PGRST116") {
        throw clientError;
      }

      if (clientData) {
        setClientId(clientData.id);
        setCurrentPlan({
          plan_id: clientData.plan_id,
          plan: clientData.plans as Plan | null,
        });
      }
    } catch (error: any) {
      console.error("Error loading current plan:", error);
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleEnrollPlan = async () => {
    if (!user || !selectedPlan || !clientId) return;

    try {
      setError("");
      setLoading(true);

      const { error: updateError } = await supabase
        .from("clients")
        .update({ plan_id: selectedPlan.id })
        .eq("id", clientId);

      if (updateError) throw updateError;

      await loadCurrentPlan();
      setIsDialogOpen(false);
      setSelectedPlan(null);
    } catch (error: any) {
      console.error("Error enrolling in plan:", error);
      setError(error.message || "Error al apuntarse al plan");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!user || !clientId) return;

    if (!confirm("¿Estás seguro de que deseas cancelar tu plan actual?"))
      return;

    try {
      setError("");
      setLoading(true);

      const { error: updateError } = await supabase
        .from("clients")
        .update({ plan_id: null })
        .eq("id", clientId);

      if (updateError) throw updateError;

      await loadCurrentPlan();
    } catch (error: any) {
      console.error("Error canceling plan:", error);
      setError(error.message || "Error al cancelar el plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <motion.div
            className="flex items-center gap-3 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Planes de Suscripción
            </h1>
          </motion.div>
          <p className="text-muted-foreground">
            Elige el plan perfecto para alcanzar tus objetivos de running
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20"
          >
            {error}
          </motion.div>
        )}

        {/* Current Plan */}
        {currentPlan?.plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card/90 to-secondary/10 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">
                        Plan Actual: {currentPlan.plan.name}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Estás suscrito a este plan
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCancelPlan}
                    disabled={loading}
                    className="border-destructive/30 hover:bg-destructive/10"
                  >
                    Cancelar Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ${currentPlan.plan.cost.toFixed(2)} MXN
                  </span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <ul className="space-y-3">
                  {currentPlan.plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Available Plans */}
        <div>
          <motion.div
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-bold">
              {currentPlan?.plan ? "Cambiar de Plan" : "Planes Disponibles"}
            </h2>
          </motion.div>

          {loading && plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando planes...
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay planes disponibles en este momento
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan, index) => {
                const isCurrentPlan = currentPlan?.plan_id === plan.id;
                const isPopular = index === Math.floor(plans.length / 2);
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -15, scale: 1.03 }}
                    className="group relative"
                  >
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-sm font-semibold shadow-lg">
                          Más Popular
                        </Badge>
                      </div>
                    )}
                    <Card
                      className={`relative h-full backdrop-blur-xl rounded-3xl overflow-hidden border shadow-xl hover:shadow-2xl transition-all duration-300 ${
                        isCurrentPlan
                          ? "bg-gradient-to-br from-primary/20 via-card/90 to-secondary/20 border-primary/40 ring-2 ring-primary/30"
                          : isPopular
                          ? "bg-gradient-to-br from-primary/20 via-card/90 to-secondary/20 border-primary/40"
                          : "bg-gradient-to-br from-card/90 to-card/50 border-primary/20"
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardHeader className="relative z-10">
                        <CardTitle className="text-2xl mb-2">
                          {plan.name}
                        </CardTitle>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            ${plan.cost.toFixed(2)} MXN
                          </span>
                          <span className="text-muted-foreground">/mes</span>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <ul className="space-y-4 mb-8">
                          {plan.features.map((feature, idx) => (
                            <motion.li
                              key={idx}
                              className="flex items-start gap-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.4,
                                delay: index * 0.1 + idx * 0.05,
                              }}
                            >
                              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">
                                {feature}
                              </span>
                            </motion.li>
                          ))}
                        </ul>
                        {isCurrentPlan ? (
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Plan Actual
                          </Button>
                        ) : (
                          <Button
                            className={`w-full group/btn ${
                              isPopular
                                ? "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                                : ""
                            }`}
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => handleSelectPlan(plan)}
                          >
                            {currentPlan?.plan
                              ? "Cambiar a este Plan"
                              : "Elegir Plan"}
                            <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Suscripción</DialogTitle>
              <DialogDescription>
                {currentPlan?.plan
                  ? `¿Estás seguro de que deseas cambiar de "${currentPlan.plan.name}" a "${selectedPlan?.name}"?`
                  : `¿Estás seguro de que deseas suscribirte al plan "${selectedPlan?.name}"?`}
              </DialogDescription>
            </DialogHeader>
            {selectedPlan && (
              <div className="py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold mb-2">{selectedPlan.name}</p>
                  <p className="text-2xl font-bold mb-4">
                    ${selectedPlan.cost.toFixed(2)} MXN/mes
                  </p>
                  <ul className="space-y-2 text-sm">
                    {selectedPlan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {selectedPlan.features.length > 3 && (
                      <li className="text-muted-foreground">
                        +{selectedPlan.features.length - 3} características más
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleEnrollPlan} disabled={loading}>
                {loading
                  ? "Procesando..."
                  : currentPlan?.plan
                  ? "Cambiar Plan"
                  : "Confirmar Suscripción"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

