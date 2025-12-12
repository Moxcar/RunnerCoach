import { supabase } from '@/lib/supabase'

export interface CoachPaymentConfig {
  id: string
  coach_id: string
  payment_type: 'percentage' | 'fixed'
  percentage_value: number | null
  fixed_amount: number | null
  updated_at: string
  updated_by: string | null
}

export interface CoachPayment {
  id: string
  coach_id: string
  admin_id: string
  amount: number
  payment_type: 'percentage' | 'fixed'
  percentage_value: number | null
  fixed_amount: number | null
  client_payment_id: string | null
  status: 'pending' | 'completed' | 'cancelled'
  payment_date: string | null
  created_at: string
  notes: string | null
  completed_at: string | null
}

/**
 * Obtiene la configuración de pago de un coach
 */
export async function getCoachPaymentConfig(
  coachId: string
): Promise<CoachPaymentConfig | null> {
  const { data, error } = await supabase
    .from('coach_payment_configs')
    .select('*')
    .eq('coach_id', coachId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Crea o actualiza la configuración de pago de un coach
 */
export async function setCoachPaymentConfig(
  coachId: string,
  config: {
    payment_type: 'percentage' | 'fixed'
    percentage_value?: number
    fixed_amount?: number
  },
  updatedBy: string
): Promise<CoachPaymentConfig> {
  const { data, error } = await supabase
    .from('coach_payment_configs')
    .upsert({
      coach_id: coachId,
      payment_type: config.payment_type,
      percentage_value: config.payment_type === 'percentage' ? config.percentage_value : null,
      fixed_amount: config.payment_type === 'fixed' ? config.fixed_amount : null,
      updated_by: updatedBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Calcula el pago que corresponde a un coach basado en un pago de cliente
 */
export async function calculateCoachPayment(
  clientPaymentId: string,
  coachId: string
): Promise<number> {
  // Obtener el pago del cliente
  const { data: clientPayment, error: paymentError } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('id', clientPaymentId)
    .single()

  if (paymentError || !clientPayment) {
    throw new Error('Pago de cliente no encontrado')
  }

  // Solo calcular si el pago está completado
  if (clientPayment.status !== 'completed') {
    return 0
  }

  // Obtener configuración del coach
  const config = await getCoachPaymentConfig(coachId)

  if (!config) {
    throw new Error('No hay configuración de pago para este coach')
  }

  const clientAmount = parseFloat(clientPayment.amount.toString())

  if (config.payment_type === 'percentage') {
    if (!config.percentage_value) {
      throw new Error('Porcentaje no configurado')
    }
    return (clientAmount * config.percentage_value) / 100
  } else {
    if (!config.fixed_amount) {
      throw new Error('Cantidad fija no configurada')
    }
    return parseFloat(config.fixed_amount.toString())
  }
}

/**
 * Crea un registro de pago a coach
 */
export async function createCoachPayment(
  coachId: string,
  adminId: string,
  amount: number,
  paymentType: 'percentage' | 'fixed',
  options?: {
    percentageValue?: number
    fixedAmount?: number
    clientPaymentId?: string
    notes?: string
  }
): Promise<CoachPayment> {
  const { data, error } = await supabase
    .from('coach_payments')
    .insert({
      coach_id: coachId,
      admin_id: adminId,
      amount,
      payment_type: paymentType,
      percentage_value: options?.percentageValue || null,
      fixed_amount: options?.fixedAmount || null,
      client_payment_id: options?.clientPaymentId || null,
      status: 'pending',
      notes: options?.notes || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Marca un pago a coach como completado
 */
export async function completeCoachPayment(
  paymentId: string,
  paymentDate?: string
): Promise<void> {
  const { error } = await supabase
    .from('coach_payments')
    .update({
      status: 'completed',
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      completed_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (error) throw error
}

/**
 * Obtiene todos los pagos de un coach
 */
export async function getCoachPayments(
  coachId: string
): Promise<CoachPayment[]> {
  const { data, error } = await supabase
    .from('coach_payments')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtiene todos los pagos a coaches (solo admin)
 */
export async function getAllCoachPayments(): Promise<CoachPayment[]> {
  const { data, error } = await supabase
    .from('coach_payments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Calcula los pagos pendientes para un coach basado en los pagos completados de sus clientes
 */
export async function calculatePendingPaymentsForCoach(
  coachId: string
): Promise<{
  totalPending: number
  payments: Array<{
    clientPaymentId: string
    clientName: string
    clientAmount: number
    coachAmount: number
    paymentDate: string
  }>
}> {
  // Obtener todos los pagos completados de los clientes de este coach
  const { data: clientPayments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      date,
      status,
      clients!inner (
        id,
        name,
        coach_id
      )
    `)
    .eq('clients.coach_id', coachId)
    .eq('status', 'completed')
    .order('date', { ascending: false })

  if (error) throw error

  // Obtener configuración del coach
  const config = await getCoachPaymentConfig(coachId)
  if (!config) {
    return { totalPending: 0, payments: [] }
  }

  // Verificar qué pagos ya tienen un coach_payment asociado
  const { data: existingPayments } = await supabase
    .from('coach_payments')
    .select('client_payment_id')
    .eq('coach_id', coachId)
    .not('client_payment_id', 'is', null)

  const existingPaymentIds = new Set(
    existingPayments?.map((p: { client_payment_id: string }) => p.client_payment_id) || []
  )

  // Calcular pagos pendientes
  const payments = []
  let totalPending = 0

  for (const payment of clientPayments || []) {
    if (existingPaymentIds.has(payment.id)) continue

    const clientAmount = parseFloat(payment.amount.toString())
    let coachAmount = 0

    if (config.payment_type === 'percentage' && config.percentage_value) {
      coachAmount = (clientAmount * config.percentage_value) / 100
    } else if (config.payment_type === 'fixed' && config.fixed_amount) {
      coachAmount = parseFloat(config.fixed_amount.toString())
    }

    payments.push({
      clientPaymentId: payment.id,
      clientName: payment.clients?.name || '',
      clientAmount,
      coachAmount,
      paymentDate: payment.date,
    })

    totalPending += coachAmount
  }

  return { totalPending, payments }
}

export interface CoachMonthlyPaymentSummary {
  coach_id: string
  coach_name: string
  total_amount: number
  payment_count: number
  payment_type: 'percentage' | 'fixed' | null
  percentage_value: number | null
  fixed_amount: number | null
  has_config: boolean
  payments: Array<{
    clientPaymentId: string
    clientName: string
    clientAmount: number
    coachAmount: number
    paymentDate: string
  }>
}

/**
 * Calcula los pagos para todos los coaches basado en los pagos de clientes de un mes específico
 */
export async function calculateAllCoachesPaymentsForMonth(
  year: number,
  month: number
): Promise<CoachMonthlyPaymentSummary[]> {
  // Calcular rango de fechas del mes (primer día y último día)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Obtener todos los pagos completados del mes
  const { data: clientPayments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      date,
      status,
      coach_id,
      client_id,
      client_user_id
    `)
    .eq('status', 'completed')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (paymentsError) throw paymentsError

  if (!clientPayments || clientPayments.length === 0) {
    return []
  }

  // Obtener todos los IDs únicos necesarios
  const clientIds = [
    ...new Set(clientPayments.map((p: any) => p.client_id).filter(Boolean)),
  ]
  const clientUserIds = [
    ...new Set(clientPayments.map((p: any) => p.client_user_id).filter(Boolean)),
  ]
  const coachIds = [
    ...new Set(clientPayments.map((p: any) => p.coach_id).filter(Boolean)),
  ]

  // Obtener información de clientes
  const clientMap = new Map<string, { name: string; coach_id: string | null }>()
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, coach_id')
      .in('id', clientIds)

    if (clients) {
      clients.forEach((client: any) => {
        clientMap.set(client.id, {
          name: client.name || 'Cliente sin nombre',
          coach_id: client.coach_id,
        })
      })
    }
  }

  // Obtener nombres de clientes desde user_profiles
  const clientUserMap = new Map<string, string>()
  if (clientUserIds.length > 0) {
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', clientUserIds)

    if (userProfiles) {
      userProfiles.forEach((profile: any) => {
        if (profile.full_name) {
          clientUserMap.set(profile.id, profile.full_name)
        }
      })
    }
  }

  // Obtener nombres de coaches
  const coachMap = new Map<string, string>()
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', coachIds)

    if (coaches) {
      coaches.forEach((coach: any) => {
        if (coach.full_name) {
          coachMap.set(coach.id, coach.full_name)
        }
      })
    }
  }

  // Obtener todas las configuraciones de pago de coaches
  const { data: configs } = await supabase
    .from('coach_payment_configs')
    .select('*')

  const configMap = new Map<string, CoachPaymentConfig>()
  if (configs) {
    configs.forEach((config: CoachPaymentConfig) => {
      configMap.set(config.coach_id, config)
    })
  }

  // Obtener pagos de coaches existentes para excluir
  const { data: existingPayments } = await supabase
    .from('coach_payments')
    .select('client_payment_id, coach_id')
    .not('client_payment_id', 'is', null)

  const existingPaymentIds = new Set(
    existingPayments?.map((p: { client_payment_id: string }) => p.client_payment_id) || []
  )

  // Agrupar pagos por coach
  const coachPaymentsMap = new Map<string, Array<{
    clientPaymentId: string
    clientName: string
    clientAmount: number
    coachAmount: number
    paymentDate: string
  }>>()

  for (const payment of clientPayments) {
    // Obtener coach_id del pago o del cliente
    let coachId = payment.coach_id
    if (!coachId && payment.client_id && clientMap.has(payment.client_id)) {
      coachId = clientMap.get(payment.client_id)?.coach_id || null
    }

    if (!coachId) continue

    // Obtener nombre del cliente
    let clientName = 'Cliente desconocido'
    if (payment.client_id && clientMap.has(payment.client_id)) {
      clientName = clientMap.get(payment.client_id)!.name
    } else if (payment.client_user_id && clientUserMap.has(payment.client_user_id)) {
      clientName = clientUserMap.get(payment.client_user_id)!
    }

    // Verificar si ya tiene un pago asociado
    if (existingPaymentIds.has(payment.id)) continue

    // Obtener configuración del coach
    const config = configMap.get(coachId)
    if (!config) {
      // Si no hay configuración, agregar al mapa pero sin calcular
      if (!coachPaymentsMap.has(coachId)) {
        coachPaymentsMap.set(coachId, [])
      }
      continue
    }

    // Calcular monto del coach
    const clientAmount = parseFloat(payment.amount.toString())
    let coachAmount = 0

    if (config.payment_type === 'percentage' && config.percentage_value) {
      coachAmount = (clientAmount * config.percentage_value) / 100
    } else if (config.payment_type === 'fixed' && config.fixed_amount) {
      coachAmount = parseFloat(config.fixed_amount.toString())
    }

    // Agregar al mapa
    if (!coachPaymentsMap.has(coachId)) {
      coachPaymentsMap.set(coachId, [])
    }

    coachPaymentsMap.get(coachId)!.push({
      clientPaymentId: payment.id,
      clientName,
      clientAmount,
      coachAmount,
      paymentDate: payment.date,
    })
  }

  // Convertir a array de resúmenes
  const summaries: CoachMonthlyPaymentSummary[] = []

  for (const [coachId, payments] of coachPaymentsMap.entries()) {
    const config = configMap.get(coachId)
    const totalAmount = payments.reduce((sum, p) => sum + p.coachAmount, 0)

    summaries.push({
      coach_id: coachId,
      coach_name: coachMap.get(coachId) || 'Coach desconocido',
      total_amount: totalAmount,
      payment_count: payments.length,
      payment_type: config?.payment_type || null,
      percentage_value: config?.percentage_value || null,
      fixed_amount: config?.fixed_amount || null,
      has_config: !!config,
      payments,
    })
  }

  // Ordenar por monto total descendente
  return summaries.sort((a, b) => b.total_amount - a.total_amount)
}

/**
 * Crea pagos masivos para múltiples coaches
 */
export async function createBulkCoachPayments(
  adminId: string,
  payments: Array<{
    coachId: string
    amount: number
    paymentType: 'percentage' | 'fixed'
    percentageValue?: number
    fixedAmount?: number
    clientPaymentIds?: string[]
    notes?: string
  }>
): Promise<CoachPayment[]> {
  const insertData = payments.map(p => ({
    coach_id: p.coachId,
    admin_id: adminId,
    amount: p.amount,
    payment_type: p.paymentType,
    percentage_value: p.paymentType === 'percentage' ? p.percentageValue : null,
    fixed_amount: p.paymentType === 'fixed' ? p.fixedAmount : null,
    client_payment_id: p.clientPaymentIds && p.clientPaymentIds.length === 1 
      ? p.clientPaymentIds[0] 
      : null,
    status: 'pending' as const,
    notes: p.notes || null,
  }))

  const { data, error } = await supabase
    .from('coach_payments')
    .insert(insertData)
    .select()

  if (error) throw error
  return data || []
}


