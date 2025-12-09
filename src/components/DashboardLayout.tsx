import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import logo from '/logo.svg'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user, role } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const coachMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Clientes', path: '/clients' },
    { icon: CreditCard, label: 'Pagos', path: '/payments' },
    { icon: Calendar, label: 'Eventos', path: '/events' },
    { icon: Settings, label: 'Configuración', path: '/settings' },
  ]

  const clientMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/client/dashboard' },
    { icon: CreditCard, label: 'Mis Pagos', path: '/client/payments' },
    { icon: Calendar, label: 'Eventos', path: '/client/events' },
  ]

  const menuItems = role === 'coach' ? coachMenuItems : clientMenuItems

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
          initial={false}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <img src={logo} alt="RunnerCoach" className="h-10" />
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <motion.div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </motion.div>
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t">
              <div className="px-4 py-2 text-sm text-muted-foreground mb-2">
                {user?.email}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-card border-b p-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
            <h1 className="text-2xl font-semibold">
              {menuItems.find((item) => item.path === location.pathname)?.label ||
                'Dashboard'}
            </h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

