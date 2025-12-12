import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/stores/authStore'

export interface Coach {
  id: string
  full_name: string
  email: string
  role: 'coach'
  is_approved: boolean
  created_at: string
}

export interface Plan {
  id: string
  name: string
  cost: number
  features: string[]
  is_active: boolean
}

export interface Client {
  id: string
  user_id: string
  coach_id: string | null
  name: string
  email: string
  phone: string
  payment_status: 'active' | 'pending' | 'overdue'
  notes: string | null
  assigned_by_admin: string | null
  created_at: string
  plan_id: string | null
  plans: Plan | null
}

/**
 * Invita a un nuevo coach a la plataforma
 * Nota: Esta función crea un perfil de coach pendiente de aprobación.
 * El coach debe registrarse normalmente con el email proporcionado.
 * Una vez registrado, el admin puede aprobarlo.
 * 
 * En producción, esto debería enviar un email de invitación con un enlace especial.
 */
export async function inviteCoach(
  email: string,
  name: string,
  invitedBy: string
): Promise<void> {
  // Verificar si ya existe un usuario con ese email
  // Como no podemos acceder a auth.users desde el cliente,
  // creamos un perfil temporal que se asociará cuando el usuario se registre
  
  // Por ahora, solo creamos una entrada en user_profiles con un ID temporal
  // Esto requiere que el coach se registre primero y luego el admin lo asocie
  // O mejor: el admin puede crear el perfil y cuando el coach se registre con ese email,
  // se actualiza automáticamente
  
  // Nota: En una implementación real, esto debería:
  // 1. Enviar un email de invitación con un token especial
  // 2. Cuando el coach hace clic en el enlace, se crea el usuario y perfil
  // 3. El perfil se crea con is_approved = false
  
  // Por ahora, solo retornamos éxito - el admin debe crear el usuario manualmente
  // o el coach se registra normalmente y luego el admin lo aprueba
  throw new Error(
    'La creación de usuarios desde el cliente no está disponible. ' +
    'El coach debe registrarse normalmente y luego el admin puede aprobarlo.'
  )
}

/**
 * Aprueba un coach
 */
export async function approveCoach(coachId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_approved: true })
    .eq('id', coachId)
    .eq('role', 'coach')

  if (error) throw error
}

/**
 * Rechaza/desactiva un coach
 */
export async function rejectCoach(coachId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_approved: false })
    .eq('id', coachId)
    .eq('role', 'coach')

  if (error) throw error
}

/**
 * Obtiene todos los coaches
 * Nota: No podemos obtener emails desde auth.users sin admin API,
 * así que obtenemos el email desde la tabla clients si existe,
 * o lo dejamos vacío
 */
export async function getAllCoaches(): Promise<Coach[]> {
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, is_approved, created_at')
    .eq('role', 'coach')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Intentar obtener emails desde clients (si el coach tiene clientes)
  // O simplemente retornar sin email ya que no podemos acceder a auth.users
  const coaches: Coach[] = (profiles || []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: '', // No disponible sin admin API
    role: 'coach' as const,
    is_approved: profile.is_approved ?? true,
    created_at: profile.created_at || '',
  }))

  return coaches
}

/**
 * Obtiene todos los clientes con su plan activo
 */
export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      plans (
        id,
        name,
        cost,
        features,
        is_active
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Transformar los datos para que plans sea un objeto o null
  return (data || []).map((client: any) => ({
    ...client,
    plans: Array.isArray(client.plans) && client.plans.length > 0 
      ? client.plans[0] 
      : client.plans || null
  }))
}

/**
 * Asigna un cliente a un coach
 */
export async function assignClientToCoach(
  clientId: string,
  coachId: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({
      coach_id: coachId,
      assigned_by_admin: adminId,
    })
    .eq('id', clientId)

  if (error) throw error
}

/**
 * Remueve la asignación de un cliente (lo deja sin coach)
 */
export async function unassignClientFromCoach(clientId: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({
      coach_id: null,
      assigned_by_admin: null,
    })
    .eq('id', clientId)

  if (error) throw error
}

/**
 * Obtiene estadísticas generales para el dashboard del admin
 */
export async function getAdminStats(): Promise<{
  totalCoaches: number
  approvedCoaches: number
  pendingCoaches: number
  totalClients: number
  clientsWithoutCoach: number
  totalRevenue: number
  pendingPayments: number
}> {
  // Obtener coaches
  const { count: totalCoaches } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'coach')

  const { count: approvedCoaches } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'coach')
    .eq('is_approved', true)

  const { count: pendingCoaches } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'coach')
    .eq('is_approved', false)

  // Obtener clientes
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const { count: clientsWithoutCoach } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .is('coach_id', null)

  // Obtener pagos
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status')

  const totalRevenue = payments
    ?.filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0

  const pendingPayments = payments
    ?.filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0

  return {
    totalCoaches: totalCoaches || 0,
    approvedCoaches: approvedCoaches || 0,
    pendingCoaches: pendingCoaches || 0,
    totalClients: totalClients || 0,
    clientsWithoutCoach: clientsWithoutCoach || 0,
    totalRevenue,
    pendingPayments,
  }
}

