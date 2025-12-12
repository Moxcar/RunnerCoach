# Guía de Deploy en Vercel

## Configuración de Variables de Entorno

Antes de hacer deploy, asegúrate de configurar las siguientes variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** > **Environment Variables**
3. Agrega las siguientes variables:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (si usas Stripe)
```

**Importante:** Estas variables deben estar configuradas para los entornos:

- ✅ Production
- ✅ Preview
- ✅ Development

## Pasos para Deploy

1. Conecta tu repositorio de GitHub a Vercel
2. Vercel detectará automáticamente que es un proyecto Vite
3. El archivo `vercel.json` ya está configurado
4. Asegúrate de que las variables de entorno estén configuradas
5. Haz clic en "Deploy"

## Solución de Problemas

### Error: "Build failed"

Si el build falla, verifica:

1. **Variables de entorno:** Asegúrate de que todas las variables `VITE_*` estén configuradas en Vercel
2. **Logs del build:** Revisa los logs completos en Vercel para ver el error específico
3. **TypeScript errors:** Si hay errores de TypeScript, corrígelos localmente primero con `npm run build`

### El build pasa pero la app no funciona

1. Verifica que las variables de entorno estén configuradas correctamente
2. Revisa la consola del navegador para errores
3. Verifica que las URLs de Supabase sean correctas

## Comandos Útiles

- `npm run build` - Build local con verificación de TypeScript
- `npm run build:vercel` - Build optimizado para Vercel (sin verificación estricta de tipos)
- `npm run dev` - Desarrollo local
