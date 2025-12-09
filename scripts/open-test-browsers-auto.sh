#!/bin/bash

# Script avanzado que abre Chrome y automáticamente hace login
# Requiere: Chrome con extensión de automatización o usar Playwright/Puppeteer
# Alternativa: Abre Chrome y muestra las credenciales para copiar/pegar

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_URL="${APP_URL:-http://localhost:5173}"
LOGIN_URL="${APP_URL}/login"

# Obtener credenciales de la base de datos si es posible
# Nota: Esto requiere acceso a la base de datos
get_credentials_from_db() {
    # Intentar obtener credenciales usando psql si está disponible
    if command -v psql &> /dev/null; then
        # Esto requeriría configuración de conexión a Supabase
        echo "Obteniendo credenciales de la base de datos..."
    fi
}

# Función para crear un script de login automático usando JavaScript
create_login_script() {
    local email=$1
    local password=$2
    local role=$3
    
    cat > /tmp/login_${role}.js << EOF
// Script de login automático para ${role}
// Ejecuta esto en la consola del navegador (F12) después de abrir la página de login

(function() {
    const email = '${email}';
    const password = '${password}';
    
    // Esperar a que la página cargue
    setTimeout(() => {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (emailInput && passwordInput && submitButton) {
            emailInput.value = email;
            passwordInput.value = password;
            
            // Disparar eventos de cambio
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Hacer click en el botón
            setTimeout(() => {
                submitButton.click();
            }, 500);
            
            console.log('✅ Login automático iniciado para ${role}');
        } else {
            console.log('❌ No se encontraron los campos de login');
        }
    }, 1000);
})();
EOF
    echo "/tmp/login_${role}.js"
}

# Verificar si node está disponible para usar Playwright
if command -v node &> /dev/null && [ -f "package.json" ]; then
    echo -e "${BLUE}🚀 Usando automatización con Node.js${NC}"
    
    # Crear script de automatización con Playwright si está disponible
    if npm list playwright &> /dev/null 2>&1 || npm list -g playwright &> /dev/null 2>&1; then
        echo -e "${GREEN}✅ Playwright encontrado${NC}"
        # Aquí se podría agregar automatización completa
    fi
fi

# Por ahora, usar el script básico pero con mejoras
echo -e "${BLUE}📋 Script de login automático${NC}"
echo ""
echo -e "${YELLOW}Para automatizar el login:${NC}"
echo "1. Abre la consola del navegador (F12)"
echo "2. Ve a la pestaña Console"
echo "3. Copia y pega el script de login que se generará"
echo ""

# Llamar al script básico
exec "$(dirname "$0")/open-test-browsers.sh" "$@"

