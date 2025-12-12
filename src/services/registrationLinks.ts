import { supabase } from '@/lib/supabase'
import { nanoid } from 'nanoid'

export interface RegistrationLink {
  id: string
  coach_id: string | null
  token: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  used_count: number
  created_by: string | null
  link_type: 'client' | 'coach'
}

export interface TokenValidationResult {
  coachId: string | null
  linkType: 'client' | 'coach' | null
}

/**
 * Genera un nuevo enlace de registro para un cliente (asignado a un coach)
 */
export async function generateRegistrationLink(
  coachId: string,
  createdBy: string,
  expiresInDays?: number
): Promise<RegistrationLink> {
  const token = nanoid(32)
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('registration_links')
    .insert({
      coach_id: coachId,
      token,
      expires_at: expiresAt,
      is_active: true,
      created_by: createdBy,
      link_type: 'client',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Genera un nuevo enlace de registro para un coach
 * Este enlace permite que alguien se registre como coach (pendiente de aprobación)
 */
export async function generateCoachRegistrationLink(
  createdBy: string,
  expiresInDays?: number
): Promise<RegistrationLink> {
  const token = nanoid(32)
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('registration_links')
    .insert({
      coach_id: null, // No hay coach asignado para enlaces de registro de coaches
      token,
      expires_at: expiresAt,
      is_active: true,
      created_by: createdBy,
      link_type: 'coach',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Valida un token de registro y retorna el coach_id asociado (para compatibilidad hacia atrás)
 * @deprecated Usar validateRegistrationTokenWithType en su lugar
 */
export async function validateRegistrationToken(
  token: string
): Promise<string | null> {
  const result = await validateRegistrationTokenWithType(token)
  return result.coachId
}

/**
 * Valida un token de registro y retorna el coach_id y el tipo de enlace
 */
export async function validateRegistrationTokenWithType(
  token: string
): Promise<TokenValidationResult> {
  const { data, error } = await supabase
    .from('registration_links')
    .select('coach_id, link_type, is_active, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { coachId: null, linkType: null }
  }

  // Verificar que esté activo
  if (!data.is_active) {
    return { coachId: null, linkType: null }
  }

  // Verificar expiración
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { coachId: null, linkType: null }
  }

  return {
    coachId: data.coach_id,
    linkType: data.link_type as 'client' | 'coach',
  }
}

/**
 * Incrementa el contador de uso de un enlace
 */
export async function incrementLinkUsage(token: string): Promise<void> {
  // Intentar usar la función RPC primero
  const { error: rpcError } = await supabase.rpc('increment_registration_link_usage', {
    link_token: token,
  })

  // Si la función RPC no existe o falla, hacer update manual
  if (rpcError) {
    // Obtener el valor actual y actualizar
    const { data: currentLink, error: fetchError } = await supabase
      .from('registration_links')
      .select('used_count')
      .eq('token', token)
      .single()

    if (fetchError) throw fetchError

    const { error: updateError } = await supabase
      .from('registration_links')
      .update({ used_count: (currentLink?.used_count || 0) + 1 })
      .eq('token', token)

    if (updateError) throw updateError
  }
}

/**
 * Obtiene todos los enlaces de un coach
 */
export async function getCoachRegistrationLinks(
  coachId: string
): Promise<RegistrationLink[]> {
  const { data, error } = await supabase
    .from('registration_links')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtiene todos los enlaces (solo admin)
 */
export async function getAllRegistrationLinks(): Promise<RegistrationLink[]> {
  const { data, error } = await supabase
    .from('registration_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Desactiva un enlace de registro
 */
export async function deactivateRegistrationLink(
  linkId: string
): Promise<void> {
  const { error } = await supabase
    .from('registration_links')
    .update({ is_active: false })
    .eq('id', linkId)

  if (error) throw error
}

/**
 * Genera la URL completa del enlace de registro
 */
export function getRegistrationUrl(token: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/register?token=${token}`
}

