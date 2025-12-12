-- Migración: Hacer coach_id nullable en clients
-- Ejecutada: 2025-12-17
-- Descripción: Permite que los clientes se registren sin un coach asignado.
--               El admin puede asignar un coach después de la inscripción.

-- Hacer coach_id nullable en clients
ALTER TABLE clients 
ALTER COLUMN coach_id DROP NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN clients.coach_id IS 'ID del coach asignado al cliente. NULL si aún no se ha asignado un coach. El admin puede asignar un coach después de la inscripción.';
