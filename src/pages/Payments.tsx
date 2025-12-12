import { useState, useEffect } from "react";
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
import { CreditCard } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getCoachPayments, type CoachPayment } from "@/services/coachPayments";
import { Badge } from "@/components/ui/badge";

export default function Payments() {
  const { user } = useAuth();
  const [coachPayments, setCoachPayments] = useState<CoachPayment[]>([]);

  useEffect(() => {
    if (user) {
      loadCoachPayments();
    }
  }, [user]);

  const loadCoachPayments = async () => {
    if (!user) return;

    try {
      const data = await getCoachPayments(user.id);
      setCoachPayments(data);
    } catch (error) {
      console.error("Error loading coach payments:", error);
    }
  };

  const totalReceived = coachPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const pendingReceived = coachPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total recibido
              </CardTitle>
              <CreditCard className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{totalReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pagos pendientes
              </CardTitle>
              <CreditCard className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{pendingReceived.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagos recibidos del admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coachPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No has recibido pagos aún
                    </TableCell>
                  </TableRow>
                ) : (
                  coachPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        €{parseFloat(payment.amount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payment.payment_date
                          ? format(
                              new Date(payment.payment_date),
                              "dd MMM yyyy"
                            )
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
                      <TableCell>{payment.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
