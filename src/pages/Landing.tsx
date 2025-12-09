import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Calendar, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import logo from '/logo.svg'

interface Event {
  id: string
  name: string
  date: string
  location: string | null
  description: string | null
  image_url: string | null
  price: number
}

export default function Landing() {
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(6)

      if (error) throw error
      if (data) {
        setEvents(data as Event[])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <motion.img
          src={logo}
          alt="RunnerCoach"
          className="h-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        />
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Iniciar sesión</Button>
          </Link>
          <Link to="/register">
            <Button>Registrarme como coach</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <motion.section
          className="text-center max-w-4xl mx-auto mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-8"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img src={logo} alt="RunnerCoach" className="h-24 mx-auto mb-8" />
          </motion.div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            La herramienta definitiva para coaches de running
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gestiona tus clientes, pagos y eventos desde un solo lugar.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8">
                Registrarme como coach
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Iniciar sesión
              </Button>
            </Link>
          </div>
        </motion.section>

        <motion.section
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            className="bg-card p-6 rounded-lg shadow-sm border"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <CheckCircle className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ahorro de tiempo</h3>
            <p className="text-muted-foreground">
              Organiza toda tu información en un solo lugar y automatiza tareas repetitivas.
            </p>
          </motion.div>
          <motion.div
            className="bg-card p-6 rounded-lg shadow-sm border"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <CheckCircle className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Control de pagos</h3>
            <p className="text-muted-foreground">
              Integración con Stripe para gestionar pagos y suscripciones de forma automática.
            </p>
          </motion.div>
          <motion.div
            className="bg-card p-6 rounded-lg shadow-sm border"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <CheckCircle className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Gestión de eventos</h3>
            <p className="text-muted-foreground">
              Crea y administra eventos, gestiona inscripciones y mantén a tus clientes informados.
            </p>
          </motion.div>
        </motion.section>

        {events.length > 0 && (
          <motion.section
            className="max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-center mb-8">
              Próximos Eventos
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Card className="h-full">
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
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(event.date), 'dd MMMM yyyy', {
                            locale: es,
                          })}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-lg font-semibold">
                          {event.price === 0 ? (
                            <span className="text-green-600">Gratis</span>
                          ) : (
                            `$${event.price.toLocaleString()}`
                          )}
                        </span>
                        <Link to="/login">
                          <Button size="sm">Ver más</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 RunnerCoach. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

