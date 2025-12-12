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
    existingPayments?.map(p => p.client_payment_id) || []
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






