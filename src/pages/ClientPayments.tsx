import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  method: "stripe" | "manual" | "cash";
  coach_id: string | null;
  email: string | null;
  event?: {
    id: string;
    name: string;
    date: string;
  } | null;
  paymentType?: "plan" | "event" | "general";
  planName?: string;
}

interface ClientPlan {
  plan_id: string | null;
  plan: {
    id: string;
    name: string;
    cost: number;
  } | null;
}

export default function ClientPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ClientPlan | null>(null);
  const [nextPlanPaymentDate, setNextPlanPaymentDate] = useState<Date | null>(
    null
  );

  useEffect(() => {
    if (user) {
      loadPayments();
      loadCurrentPlan();
    }
  }, [user]);

  const loadPayments = async () => {
    if (!user) return;

    try {
      // Obtener el plan actual para identificar pagos del plan
      const { data: clientData } = await supabase
        .from("clients")
        .select("plan_id, plans(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentPlanCost =
        clientData?.plans && typeof clientData.plans === "object"
          ? (clientData.plans as { cost: number }).cost
          : null;

      // Obtener todos los pagos por user_id o por email (normalizado)
      const userEmail = user.email?.toLowerCase().trim();

      // Construir la consulta OR correctamente
      // Si hay email, buscar por ambos; si no, solo por client_user_id
      const orCondition = userEmail
        ? `client_user_id.eq.${user.id},email.eq.${userEmail}`
        : `client_user_id.eq.${user.id}`;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .or(orCondition)
        .order("date", { ascending: false });

      if (paymentsError) {
        console.error("Error loading payments:", paymentsError);
        throw paymentsError;
      }

      console.log("Payments loaded:", paymentsData?.length || 0, "payments");

      if (!paymentsData || paymentsData.length === 0) {
        setPayments([]);
        return;
      }

      // Obtener todos los registros de eventos del usuario para hacer matching más eficiente
      const userEmailNormalized = user.email?.toLowerCase().trim();
      const { data: allRegistrations } = await supabase
        .from("event_registrations")
        .select(
          `
          id,
          event_id,
          created_at,
          user_id,
          email,
          events!inner (
            id,
            name,
            date,
            price
          )
        `
        )
        .or(
          `user_id.eq.${user.id}${
            userEmailNormalized ? `,email.eq.${userEmailNormalized}` : ""
          }`
        );

      // Crear un mapa de eventos por precio para búsqueda rápida
      const eventMap = new Map<number, any[]>();
      if (allRegistrations) {
        allRegistrations.forEach((reg: any) => {
          if (reg.events) {
            const eventPrice = parseFloat(reg.events.price.toString());
            if (!eventMap.has(eventPrice)) {
              eventMap.set(eventPrice, []);
            }
            eventMap.get(eventPrice)!.push({
              ...reg.events,
              registrationDate: reg.created_at,
            });
          }
        });
      }

      // Procesar cada pago
      const paymentsWithInfo = await Promise.all(
        paymentsData.map(async (payment: any) => {
          let eventInfo = null;
          let paymentType: "plan" | "event" | "general" = "general";
          let planName: string | undefined = undefined;

          // Verificar si es un pago del plan mensual
          if (
            currentPlanCost &&
            Math.abs(parseFloat(payment.amount.toString()) - currentPlanCost) <
              0.01
          ) {
            paymentType = "plan";
            if (clientData?.plans && typeof clientData.plans === "object") {
              planName = (clientData.plans as { name: string }).name;
            }
          } else {
            // Buscar evento relacionado
            const paymentAmount = parseFloat(payment.amount.toString());
            const paymentDate = new Date(payment.date);

            // Buscar en el mapa de eventos (tolerancia de 0.01 para diferencias de redondeo)
            let bestMatch: any = null;
            let bestMatchDiff = Infinity;

            eventMap.forEach((events, eventPrice) => {
              // Comparar con tolerancia para diferencias de redondeo
              if (Math.abs(eventPrice - paymentAmount) < 0.01) {
                events.forEach((event) => {
                  const regDate = new Date(event.registrationDate);
                  const diff = Math.abs(
                    paymentDate.getTime() - regDate.getTime()
                  );
                  // Considerar eventos registrados hasta 30 días antes o después del pago
                  // (para cubrir casos donde el pago se hizo días después del registro)
                  if (diff < 30 * 24 * 60 * 60 * 1000 && diff < bestMatchDiff) {
                    bestMatch = event;
                    bestMatchDiff = diff;
                  }
                });
              }
            });

            if (bestMatch) {
              eventInfo = {
                id: bestMatch.id,
                name: bestMatch.name,
                date: bestMatch.date,
              };
              paymentType = "event";
            }
          }

          return {
            ...payment,
            event: eventInfo,
            paymentType,
            planName,
          };
        })
      );

      setPayments(paymentsWithInfo as Payment[]);
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const loadCurrentPlan = async () => {
    if (!user) return;

    try {
      // Obtener el plan actual del cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, plan_id, plans(*)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clientError && clientError.code !== "PGRST116") {
        throw clientError;
      }

      if (clientData && clientData.plan_id && clientData.plans) {
        const plan = clientData.plans as ClientPlan["plan"];
        setCurrentPlan({
          plan_id: clientData.plan_id,
          plan: plan,
        });

        // Buscar el último pago del plan (mismo monto que el costo del plan)
        const { data: lastPlanPayment } = await supabase
          .from("payments")
          .select("date")
          .eq("client_user_id", user.id)
          .eq("amount", plan.cost)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Calcular la próxima fecha de pago
        let nextPaymentDate: Date;
        if (lastPlanPayment) {
          // Si hay un pago previo, agregar 1 mes a esa fecha
          const lastDate = new Date(lastPlanPayment.date);
          nextPaymentDate = new Date(
            lastDate.getFullYear(),
            lastDate.getMonth() + 1,
            lastDate.getDate()
          );
        } else {
          // Si no hay pagos previos, usar la fecha actual + 1 mes
          const today = new Date();
          nextPaymentDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
          );
        }

        // Si la fecha calculada ya pasó, calcular el siguiente mes desde hoy
        const today = new Date();
        if (nextPaymentDate <= today) {
          nextPaymentDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            today.getDate()
          );
        }

        setNextPlanPaymentDate(nextPaymentDate);
      } else {
        setCurrentPlan(null);
        setNextPlanPaymentDate(null);
      }
    } catch (error) {
      console.error("Error loading current plan:", error);
    }
  };

  const getStatusBadge = (status: Payment["status"]) => {
    const styles = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-orange-100 text-orange-800",
      failed: "bg-red-100 text-red-800",
    };

    const labels = {
      completed: "Completado",
      pending: "Pendiente",
      failed: "Fallido",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getMethodLabel = (method: Payment["method"]) => {
    const labels = {
      stripe: "Stripe",
      manual: "Manual",
      cash: "Efectivo",
    };
    return labels[method];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Pagos</h1>
          <p className="text-muted-foreground">
            Visualiza tu historial de pagos
          </p>
        </div>

        {/* Próximo pago del plan */}
        {currentPlan?.plan && nextPlanPaymentDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
              <CardHeader>
                <CardTitle className="text-lg">Próximo pago del plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Plan: {currentPlan.plan.name}
                    </p>
                    <p className="text-2xl font-bold">
                      ${currentPlan.plan.cost.toLocaleString()} MXN
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Fecha de pago:{" "}
                      <span className="font-semibold text-foreground">
                        {format(nextPlanPaymentDate, "dd MMMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.date), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell>
                          {payment.paymentType === "plan" &&
                          payment.planName ? (
                            <div>
                              <div className="font-medium text-primary">
                                Plan: {payment.planName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pago mensual
                              </div>
                            </div>
                          ) : payment.paymentType === "event" &&
                            payment.event ? (
                            <div>
                              <div className="font-medium">
                                {payment.event.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Evento -{" "}
                                {format(
                                  new Date(payment.event.date),
                                  "dd MMM yyyy",
                                  { locale: es }
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Pago general
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          $
                          {parseFloat(
                            payment.amount.toString()
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell>{getMethodLabel(payment.method)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
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
