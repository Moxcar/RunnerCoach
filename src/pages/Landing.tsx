import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import logo from '/logo.svg'

export default function Landing() {
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
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
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
      </main>

      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 RunnerCoach. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

