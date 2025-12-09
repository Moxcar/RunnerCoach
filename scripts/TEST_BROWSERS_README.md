# Scripts para Pruebas con Múltiples Perfiles de Chrome

Estos scripts te permiten abrir Chrome con perfiles separados para probar la aplicación como coach y cliente simultáneamente.

## Scripts Disponibles

### 1. `open-test-browsers.sh` - Script Básico

Abre Chrome con dos perfiles separados (coach y cliente) y navega a la página de login.

**Uso básico:**

```bash
./scripts/open-test-browsers.sh
```

**Uso con emails personalizados:**

```bash
COACH_EMAIL='coach@runnercoach.test' \
CLIENT_EMAIL='cliente1@runnercoach.test' \
./scripts/open-test-browsers.sh
```

**Configurar URL de la aplicación:**

```bash
APP_URL='http://localhost:5173' ./scripts/open-test-browsers.sh
```

### 2. `get-test-credentials.sql` - Obtener Credenciales

Ejecuta este script en el SQL Editor de Supabase para obtener los emails de coach y cliente del seeder.

**Uso:**

1. Ve a: https://app.supabase.com/project/ngtxialivasllpzjwzen/sql/new
2. Copia y pega el contenido de `scripts/get-test-credentials.sql`
3. Ejecuta el script
4. Copia los emails y úsalos con el script de Chrome

### 3. `open-test-browsers-auto.sh` - Versión Avanzada

Versión mejorada con opciones adicionales (requiere configuración adicional).

## Requisitos

- Chrome o Chromium instalado
- Servidor de desarrollo corriendo (`npm run dev`)
- Credenciales de prueba (del seeder o manuales)

## Instalación de Chrome (si no está instalado)

**Ubuntu/Debian:**

```bash
wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i /tmp/chrome.deb
sudo apt-get install -f -y
```

**O usando apt:**

```bash
sudo apt-get update
sudo apt-get install -y google-chrome-stable
```

## Flujo de Trabajo Recomendado

### Paso 1: Obtener Credenciales

Ejecuta el script SQL para obtener los emails:

```sql
-- En Supabase SQL Editor
SELECT
  'COACH' as tipo,
  u.email,
  'password123' as password,
  up.full_name
FROM auth.users u
JOIN user_profiles up ON u.id = up.id
WHERE up.role = 'coach'
LIMIT 1;
```

### Paso 2: Abrir Chrome con Perfiles

```bash
COACH_EMAIL='email_del_coach@runnercoach.test' \
CLIENT_EMAIL='email_del_cliente@runnercoach.test' \
./scripts/open-test-browsers.sh
```

### Paso 3: Hacer Login

**Con Playwright (Automático):**
Si tienes Playwright instalado, el login se hace automáticamente. Solo ejecuta:

```bash
npm install -D playwright
npx playwright install chromium
./scripts/open-test-browsers.sh
```

**Sin Playwright (Semi-automático):**

1. Abre la consola del navegador (F12)
2. Ve a la pestaña Console
3. Copia y pega el script que se muestra (ubicado en `/tmp/auto_login_*.js`)
4. Presiona Enter
5. El formulario se rellenará y enviará automáticamente

**Manual:**

1. Ingresa el email correspondiente
2. Ingresa la contraseña: `password123`
3. Haz clic en "Iniciar sesión"

## Ubicación de Perfiles

Los perfiles de Chrome se guardan en:

- **Coach**: `~/.config/google-chrome-coach`
- **Cliente**: `~/.config/google-chrome-client`

Esto permite mantener sesiones separadas entre pruebas.

## Solución de Problemas

### Chrome no se abre

- Verifica que Chrome esté instalado: `which google-chrome`
- Verifica que el servidor esté corriendo: `curl http://localhost:5173`

### No puedo hacer login

- Verifica que los emails sean correctos (ejecuta `get-test-credentials.sql`)
- Verifica que la contraseña sea `password123`
- Verifica que el usuario exista en la base de datos

### Los perfiles se mezclan

- Cierra todas las ventanas de Chrome antes de ejecutar el script
- Los perfiles están en directorios separados, no deberían mezclarse

## Automatización Avanzada

Para automatizar el login completamente, puedes usar Playwright o Puppeteer. Ejemplo básico:

```javascript
// Ejemplo con Playwright
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:5173/login");
  await page.fill('input[type="email"]', "coach@runnercoach.test");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard");
})();
```

## Notas

- Todos los usuarios del seeder tienen la contraseña: `password123`
- Los emails siguen el formato: `nombre.apellido@runnercoach.test` (sin acentos)
- Los perfiles se mantienen entre ejecuciones del script
