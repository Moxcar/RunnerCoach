import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Clock, Calendar, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface Payment {
  id: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
  method: 'stripe' | 'manual' | 'cash'
}

interface Event {
  id: string
  name: string
  date: string
  location: string | null
  image_url: string | null
  price: number
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingPayments: 0,
    upcomingEvents: 0,
    completedPayments: 0,
  })
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      // Obtener cliente asociado
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, coach_id')
        .eq('user_id', user.id)
        .single()

      if (!clientData) {
        console.log('No se encontró registro de cliente')
        return
      }

      // Cargar pagos
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('client_user_id', user.id)
        .order('date', { ascending: false })
        .limit(5)

      if (payments) {
        setRecentPayments(payments as Payment[])
        const totalPaid = payments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0)
        const pending = payments.filter((p: any) => p.status === 'pending').length
        const completed = payments.filter((p: any) => p.status === 'completed').length

        setStats((prev) => ({
          ...prev,
          totalPaid,
          pendingPayments: pending,
          completedPayments: completed,
        }))
      }

      // Cargar eventos inscritos
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id, events(*)')
        .eq('user_id', user.id)

      if (registrations) {
        const events = registrations
          .map((r: any) => r.events)
          .filter((e: any) => new Date(e.date) >= new Date())
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3)

        setUpcomingEvents(events)
        setStats((prev) => ({
          ...prev,
          upcomingEvents: events.length,
        }))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const statCards = [
    {
      title: 'Total pagado',
      value: `$${stats.totalPaid.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Pagos pendientes',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'text-orange-600',
    },
    {
      title: 'Próximos eventos',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: 'text-purple-600',
    },
    {
      title: 'Pagos completados',
      value: stats.completedPayments,
      icon: CheckCircle,
      color: 'text-blue-600',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pagos recientes</CardTitle>
                  <Link to="/client/payments">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay pagos registrados
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            ${parseFloat(payment.amount.toString()).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.date), 'dd MMM yyyy', {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {payment.status === 'completed'
                            ? 'Completado'
                            : payment.status === 'pending'
                            ? 'Pendiente'
                            : 'Fallido'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Próximos eventos</CardTitle>
                  <Link to="/client/events">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tienes eventos próximos
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        {event.image_url && (
                          <div className="w-full h-32 overflow-hidden">
                            <img
                              src={event.image_url}
                              alt={event.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.date), 'dd MMM yyyy', {
                              locale: es,
                            })}
                          </p>
                          {event.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {event.location}
                            </p>
                          )}
                          <div className="mt-2">
                            <span className="text-sm font-semibold">
                              {event.price === 0 ? (
                                <span className="text-green-600">Gratis</span>
                              ) : (
                                `$${event.price.toLocaleString()}`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}

