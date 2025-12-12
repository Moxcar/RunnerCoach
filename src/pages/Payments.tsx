import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, DollarSign, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getCoachPayments, type CoachPayment } from '@/services/coachPayments'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface Payment {
  id: string
  client_name: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  method: 'stripe' | 'manual' | 'cash'
}

interface Client {
  id: string
  user_id: string
  name: string
}

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [coachPayments, setCoachPayments] = useState<CoachPayment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('clients')
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'manual' as Payment['method'],
  })

  useEffect(() => {
    if (user) {
      loadPayments()
      loadClients()
      loadCoachPayments()
    }
  }, [user])

  const loadClients = async () => {
    if (!user) return

    try {
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('coach_id', user.id)

      if (error) throw error

      if (clientsData) {
        // Obtener nombres de los clientes desde user_profiles
        const userIds = clientsData.map((c) => c.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', userIds)

        if (profilesError) throw profilesError

        const clientsWithNames = clientsData.map((client) => {
          const profile = profiles?.find((p) => p.id === client.user_id)
          return {
            id: client.id,
            user_id: client.user_id,
            name: profile?.full_name || 'Cliente sin nombre',
          }
        })

        setClients(clientsWithNames)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadPayments = async () => {
    if (!user) return

    try {
      // Obtener todos los pagos del coach con información del cliente
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*, client_user_id')
        .eq('coach_id', user.id)
        .order('date', { ascending: false })

      if (error) throw error

      if (paymentsData && paymentsData.length > 0) {
        // Obtener nombres de los clientes desde user_profiles
        const clientUserIds = [...new Set(paymentsData.map((p) => p.client_user_id).filter(Boolean))]
        
        if (clientUserIds.length === 0) {
          setPayments([])
          return
        }

        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', clientUserIds)

        if (profilesError) {
          console.error('Error loading profiles:', profilesError)
        }

        // Si no encontramos perfiles, intentar obtener desde auth.users (solo email como fallback)
        const profileMap = new Map<string, string>()
        if (profiles) {
          profiles.forEach((profile) => {
            if (profile.full_name) {
              profileMap.set(profile.id, profile.full_name)
            }
          })
        }

        // Mapear pagos con nombres de clientes
        const paymentsWithNames = paymentsData.map((payment) => {
          const clientUserId = payment.client_user_id
          let clientName = 'Cliente sin nombre'

          if (clientUserId) {
            // Intentar obtener desde el mapa de perfiles
            const nameFromProfile = profileMap.get(clientUserId)
            if (nameFromProfile) {
              clientName = nameFromProfile
            } else {
              // Si no hay perfil, intentar obtener desde clients si tiene nombre
              // O usar el email como último recurso
              console.warn(`No se encontró nombre para cliente ${clientUserId}`)
            }
          }

          return {
            id: payment.id,
            client_name: clientName,
            amount: parseFloat(payment.amount.toString()),
            date: payment.date,
            status: payment.status as Payment['status'],
            method: payment.method as Payment['method'],
          }
        })

        setPayments(paymentsWithNames)
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error('Error loading payments:', error)
      setPayments([])
    }
  }

  const handleAddPayment = async () => {
    if (!user || !formData.client_id || !formData.amount) return

    try {
      // Obtener el user_id del cliente seleccionado
      const selectedClient = clients.find((c) => c.id === formData.client_id)
      if (!selectedClient) {
        console.error('Cliente no encontrado')
        return
      }

      const { error } = await supabase.from('payments').insert({
        coach_id: user.id,
        client_user_id: selectedClient.user_id,
        amount: parseFloat(formData.amount),
        date: formData.date,
        method: formData.method,
        status: 'completed',
      })

      if (error) throw error

      setIsDialogOpen(false)
      setFormData({
        client_id: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'manual',
      })
      loadPayments()
    } catch (error) {
      console.error('Error adding payment:', error)
    }
  }

  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const loadCoachPayments = async () => {
    if (!user) return

    try {
      const data = await getCoachPayments(user.id)
      setCoachPayments(data)
    } catch (error) {
      console.error('Error loading coach payments:', error)
    }
  }

  const getStatusBadge = (status: Payment['status']) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    }
    const labels = {
      completed: 'Completado',
      pending: 'Pendiente',
      failed: 'Fallido',
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    )
  }

  const totalReceived = coachPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

  const pendingReceived = coachPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="clients">Pagos de Clientes</TabsTrigger>
            <TabsTrigger value="received">Pagos Recibidos</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total recaudado
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pagos pendientes
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{pendingAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar pago manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar pago</DialogTitle>
                <DialogDescription>
                  Registra un pago realizado por un cliente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
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
                  <Label htmlFor="method">Método de pago</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value: Payment['method']) =>
                      setFormData({ ...formData, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="cash">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPayment}>Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Historial de pagos de clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay pagos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {payment.client_name}
                            </TableCell>
                            <TableCell>€{payment.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {format(new Date(payment.date), 'dd MMM yyyy')}
                            </TableCell>
                            <TableCell className="capitalize">{payment.method}</TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total recibido
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{totalReceived.toFixed(2)}</div>
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
                  <div className="text-2xl font-bold">€{pendingReceived.toFixed(2)}</div>
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
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
                              ? format(new Date(payment.payment_date), 'dd MMM yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payment.status === 'completed'
                                  ? 'default'
                                  : payment.status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {payment.status === 'completed'
                                ? 'Completado'
                                : payment.status === 'pending'
                                  ? 'Pendiente'
                                  : 'Cancelado'}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

