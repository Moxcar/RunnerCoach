import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Genera la URL del evento usando slug si está disponible, o ID como fallback
 * @param event - Objeto del evento con id y opcionalmente slug
 * @returns URL del evento (ej: /events/uby-protrail-2025 o /events/uuid)
 */
export function getEventUrl(event: { id: string; slug?: string | null }): string {
  return `/events/${event.slug || event.id}`
}

/**
 * Verifica si un rol corresponde a un cliente
 * En la base de datos el rol es 'user', pero en el frontend se mapea a 'client'
 * Esta función acepta ambos para mantener compatibilidad
 * @param role - Rol a verificar
 * @returns true si el rol es de cliente (user o client)
 */
export function isClientRole(role: string | null | undefined): boolean {
  return role === "user" || role === "client"
}

