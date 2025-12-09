# Configuración de Pagos en el Registro

Se ha implementado la funcionalidad para que los usuarios puedan subir comprobantes de transferencia o pagar con Stripe durante el registro.

## Funcionalidades implementadas

### 1. Subida de Comprobantes
- Los usuarios pueden subir un comprobante de transferencia (PDF, JPG, PNG)
- Validación de tipo de archivo y tamaño (máx. 5MB)
- Los archivos se almacenan en Supabase Storage
- La URL del comprobante se guarda en la tabla `payments`

### 2. Pago con Stripe
- Integración con Stripe Checkout
- Requiere un endpoint backend para crear la sesión de checkout
- El usuario es redirigido a Stripe para completar el pago

## Configuración necesaria

### 1. Base de datos
Ejecuta la migración para agregar el campo `receipt_url`:

```sql
-- Si ya tienes la tabla payments, ejecuta:
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS receipt_url text;
```

O ejecuta el archivo: `supabase/migration_add_receipt_url.sql`

### 2. Supabase Storage
Configura el bucket de almacenamiento para comprobantes. Ver: `supabase/STORAGE_SETUP.md`

### 3. Stripe (Opcional)
Para habilitar pagos con Stripe, necesitas:

1. **Configurar variables de entorno:**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Crear endpoint backend para Checkout:**
   El código actual intenta llamar a `/api/create-checkout-session`. Necesitas crear este endpoint en tu backend que:
   - Cree una sesión de Stripe Checkout
   - Retorne el `sessionId`
   - Maneje el webhook de Stripe para actualizar el estado del pago

   Ejemplo de endpoint (Node.js/Express):
   ```javascript
   app.post('/api/create-checkout-session', async (req, res) => {
     const { amount, currency, userId, email, name, role } = req.body;
     
     const session = await stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{
         price_data: {
           currency: currency || 'usd',
           product_data: {
             name: 'Registro RunnerCoach',
           },
           unit_amount: amount,
         },
         quantity: 1,
       }],
       mode: 'payment',
       success_url: `${req.headers.origin}/register-success?session_id={CHECKOUT_SESSION_ID}`,
       cancel_url: `${req.headers.origin}/register`,
       customer_email: email,
       metadata: {
         userId,
         name,
         role,
       },
     });
     
     res.json({ sessionId: session.id });
   });
   ```

3. **Configurar webhook de Stripe:**
   Para actualizar automáticamente el estado del pago cuando se complete, configura un webhook que:
   - Escuche el evento `checkout.session.completed`
   - Actualice el registro de pago en la base de datos

## Uso

1. El usuario completa el formulario de registro
2. Selecciona el método de pago:
   - **Subir comprobante**: Sube un archivo y completa el registro
   - **Pagar con Stripe**: Es redirigido a Stripe para completar el pago
3. Después del registro, el pago se registra en la tabla `payments` con estado `pending`

## Notas

- Si no hay backend configurado para Stripe, el usuario verá un mensaje y puede usar la opción de subir comprobante
- Los comprobantes se validan antes de subir (tipo y tamaño)
- El monto es opcional pero recomendado para llevar un registro adecuado

