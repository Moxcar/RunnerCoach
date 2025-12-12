#!/bin/bash

# Script para abrir Chrome con perfiles de admin y usuario para pruebas
# Este script abre dos ventanas de Chrome con perfiles separados y obtiene credenciales automáticamente

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL de la aplicación (ajusta si es diferente)
APP_URL="${APP_URL:-http://localhost:5173}"
LOGIN_URL="${APP_URL}/login"

# Directorios para perfiles de Chrome
ADMIN_PROFILE_DIR="$HOME/.config/google-chrome-admin"
USER_PROFILE_DIR="$HOME/.config/google-chrome-user"

# Contraseña por defecto
PASSWORD="password123"

echo -e "${BLUE}🚀 Abriendo Chrome para pruebas${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Verificar si Chrome está instalado
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null && ! command -v chromium &> /dev/null; then
    echo -e "${YELLOW}⚠️  Chrome/Chromium no está instalado.${NC}"
    echo "Instalando Chrome..."
    
    # Intentar instalar Chrome
    if command -v wget &> /dev/null; then
        echo "Descargando Chrome..."
        wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
        sudo dpkg -i /tmp/chrome.deb 2>/dev/null || sudo apt-get install -f -y
    else
        echo -e "${YELLOW}Por favor, instala Chrome manualmente:${NC}"
        echo "  sudo apt-get update && sudo apt-get install -y google-chrome-stable"
        exit 1
    fi
fi

# Detectar el comando de Chrome
CHROME_CMD=""
if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
fi

if [ -z "$CHROME_CMD" ]; then
    echo -e "${YELLOW}❌ No se pudo encontrar Chrome/Chromium${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Chrome encontrado: $CHROME_CMD${NC}"
echo ""

# Verificar si el servidor está corriendo
echo -e "${BLUE}Verificando si el servidor está corriendo en $APP_URL...${NC}"
if ! curl -s "$APP_URL" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo en $APP_URL${NC}"
    echo -e "${YELLOW}   Inicia el servidor con: npm run dev${NC}"
    echo ""
    read -p "¿Deseas continuar de todas formas? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Cargar variables de entorno si existe .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/.env" ]; then
    # Cargar variables de entorno del .env
    set -a
    source "$PROJECT_DIR/.env" 2>/dev/null || true
    set +a
fi

# Función para obtener credenciales usando la API de Supabase
get_credentials_from_api() {
    local supabase_url="${VITE_SUPABASE_URL:-}"
    local service_role_key="${SUPABASE_SERVICE_ROLE_KEY:-}"
    
    if [ -z "$supabase_url" ] || [ -z "$service_role_key" ]; then
        return 1
    fi
    
    # Verificar si node está disponible
    if ! command -v node &> /dev/null; then
        return 1
    fi
    
    # Verificar si el script existe
    local script_path="$SCRIPT_DIR/get-credentials-api.js"
    if [ ! -f "$script_path" ]; then
        return 1
    fi
    
    echo -e "${BLUE}   Intentando con API de Supabase...${NC}"
    
    # Ejecutar el script Node.js y capturar la salida
    local api_output=$(node "$script_path" 2>&1)
    local api_exit_code=$?
    
    if [ $api_exit_code -eq 0 ]; then
        # Parsear la salida del script Node.js
        while IFS= read -r line; do
            if [[ "$line" =~ ^ADMIN_EMAIL=(.+)$ ]]; then
                ADMIN_EMAIL="${BASH_REMATCH[1]}"
                echo -e "${GREEN}✅ Admin encontrado (API): $ADMIN_EMAIL${NC}"
            elif [[ "$line" =~ ^USER_EMAIL=(.+)$ ]]; then
                USER_EMAIL="${BASH_REMATCH[1]}"
                echo -e "${GREEN}✅ Usuario encontrado (API): $USER_EMAIL${NC}"
            fi
        done <<< "$api_output"
        
        if [ -n "$ADMIN_EMAIL" ] && [ -n "$USER_EMAIL" ]; then
            return 0
        fi
    else
        # Mostrar errores del script si los hay
        echo "$api_output" | grep -i "error" >&2 || true
    fi
    
    return 1
}

# Función para validar email
validate_email() {
    local email=$1
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] && [[ ! "$email" =~ (error|fatal|connection|server|running|accepting|TCP|IP) ]]; then
        return 0
    else
        return 1
    fi
}

# Obtener emails de admin y usuario
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
USER_EMAIL="${USER_EMAIL:-}"

# Si no se proporcionaron emails, intentar obtenerlos de la API
if [ -z "$ADMIN_EMAIL" ] || [ -z "$USER_EMAIL" ]; then
    if ! get_credentials_from_api; then
        echo -e "${YELLOW}💡 No se pudieron obtener credenciales automáticamente${NC}"
        echo ""
        echo -e "${BLUE}📋 Para obtener credenciales manualmente:${NC}"
        echo -e "   1. Ve a: https://app.supabase.com"
        echo -e "   2. Selecciona tu proyecto"
        echo -e "   3. Ve a SQL Editor"
        echo -e "   4. Ejecuta este SQL:"
        echo ""
        echo -e "${GREEN}   -- Obtener email del admin${NC}"
        echo -e "${BLUE}   SELECT u.email FROM auth.users u${NC}"
        echo -e "${BLUE}   JOIN user_profiles up ON u.id = up.id${NC}"
        echo -e "${BLUE}   WHERE up.role = 'admin' LIMIT 1;${NC}"
        echo ""
        echo -e "${GREEN}   -- Obtener email de un usuario${NC}"
        echo -e "${BLUE}   SELECT u.email FROM auth.users u${NC}"
        echo -e "${BLUE}   JOIN user_profiles up ON u.id = up.id${NC}"
        echo -e "${BLUE}   WHERE up.role = 'user' LIMIT 1;${NC}"
        echo ""
        echo -e "   5. Luego ejecuta:"
        echo -e "      ${BLUE}ADMIN_EMAIL='email@runnercoach.test' USER_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers-auto.sh${NC}"
        echo ""
    fi
fi

# Si aún no hay emails válidos, validar y mostrar advertencia
if [ -z "$ADMIN_EMAIL" ] || ! validate_email "$ADMIN_EMAIL"; then
    if [ -n "$ADMIN_EMAIL" ] && ! validate_email "$ADMIN_EMAIL"; then
        echo -e "${YELLOW}⚠️  Email de admin inválido obtenido: '$ADMIN_EMAIL'${NC}"
    else
        echo -e "${YELLOW}⚠️  No se especificó ADMIN_EMAIL y no se pudo obtener${NC}"
    fi
    ADMIN_EMAIL=""
fi

if [ -z "$USER_EMAIL" ] || ! validate_email "$USER_EMAIL"; then
    if [ -n "$USER_EMAIL" ] && ! validate_email "$USER_EMAIL"; then
        echo -e "${YELLOW}⚠️  Email de usuario inválido obtenido: '$USER_EMAIL'${NC}"
    else
        echo -e "${YELLOW}⚠️  No se especificó USER_EMAIL y no se pudo obtener${NC}"
    fi
    USER_EMAIL=""
fi

# Si no hay emails válidos, no continuar
if [ -z "$ADMIN_EMAIL" ] || [ -z "$USER_EMAIL" ]; then
    echo ""
    echo -e "${YELLOW}❌ No se pueden abrir los navegadores sin emails válidos${NC}"
    echo -e "${YELLOW}   Por favor, proporciona los emails manualmente o ejecuta el SQL en Supabase${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📧 Credenciales:${NC}"
echo -e "   Admin:  ${BLUE}$ADMIN_EMAIL${NC} / $PASSWORD"
echo -e "   Usuario: ${BLUE}$USER_EMAIL${NC} / $PASSWORD"
echo ""

# Función para crear script de auto-login con JavaScript
create_auto_login_script() {
    local email=$1
    local password=$2
    local role=$3
    
    # Escapar caracteres especiales para sed
    local email_escaped=$(echo "$email" | sed 's/[[\.*^$()+?{|]/\\&/g')
    local password_escaped=$(echo "$password" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    cat > /tmp/auto_login_${role}.js << AUTOLOGIN_EOF
// Script de auto-login - Ejecutar en consola del navegador (F12)
(function() {
    const email = '${email_escaped}';
    const password = '${password_escaped}';
    
    console.log('🔐 Iniciando auto-login...');
    
    function fillAndSubmit() {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!emailInput || !passwordInput || !submitButton) {
            console.log('⏳ Esperando campos de formulario...');
            setTimeout(fillAndSubmit, 500);
            return;
        }
        
        console.log('✍️  Rellenando formulario...');
        emailInput.value = email;
        passwordInput.value = password;
        
        // Disparar eventos para que React detecte los cambios
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Pequeña pausa antes de enviar
        setTimeout(() => {
            console.log('🚀 Enviando formulario...');
            submitButton.click();
        }, 300);
    }
    
    // Esperar a que la página cargue completamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fillAndSubmit);
    } else {
        setTimeout(fillAndSubmit, 1000);
    }
})();
AUTOLOGIN_EOF
    
    echo "/tmp/auto_login_${role}.js"
}

# Función para crear extensión temporal de Chrome para auto-login
create_chrome_extension() {
    local email=$1
    local password=$2
    local role=$3
    local extension_dir="/tmp/chrome_extension_${role}"
    
    # Crear directorio de extensión
    mkdir -p "$extension_dir"
    
    # Escapar caracteres especiales para JavaScript
    local email_escaped=$(echo "$email" | sed "s/'/\\\\'/g" | sed 's/"/\\"/g')
    local password_escaped=$(echo "$password" | sed "s/'/\\\\'/g" | sed 's/"/\\"/g')
    
    # Crear manifest.json
    cat > "$extension_dir/manifest.json" << EOF
{
  "manifest_version": 3,
  "name": "Auto Login ${role}",
  "version": "1.0",
  "permissions": ["activeTab"],
  "content_scripts": [
    {
      "matches": ["${APP_URL}/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
EOF
    
    # Crear content script
    cat > "$extension_dir/content.js" << EOF
(function() {
    const email = '${email_escaped}';
    const password = '${password_escaped}';
    
    function attemptLogin() {
        // Solo ejecutar en la página de login
        if (!window.location.href.includes('/login')) {
            return;
        }
        
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!emailInput || !passwordInput || !submitButton) {
            setTimeout(attemptLogin, 500);
            return;
        }
        
        // Verificar si ya se intentó el login (evitar múltiples intentos)
        if (emailInput.value === email && passwordInput.value === password) {
            return;
        }
        
        console.log('🔐 Iniciando auto-login...');
        console.log('✍️  Rellenando formulario...');
        
        emailInput.value = email;
        passwordInput.value = password;
        
        // Disparar eventos para que React detecte los cambios
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Pequeña pausa antes de enviar
        setTimeout(() => {
            console.log('🚀 Enviando formulario...');
            submitButton.click();
        }, 500);
    }
    
    // Ejecutar cuando la página esté lista
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptLogin);
    } else {
        setTimeout(attemptLogin, 1000);
    }
    
    // También intentar después de un tiempo adicional por si la página carga lentamente
    setTimeout(attemptLogin, 2000);
})();
EOF
    
    echo "$extension_dir"
}

# Función para abrir Chrome con auto-login
open_chrome_profile_with_login() {
    local profile_name=$1
    local profile_dir=$2
    local url=$3
    local label=$4
    local email=$5
    local password=$6
    
    echo -e "${GREEN}Abriendo Chrome - ${label}...${NC}"
    
    # Crear extensión temporal de Chrome para auto-login
    local extension_dir=$(create_chrome_extension "$email" "$password" "$profile_name")
    
    # Abrir Chrome con la extensión cargada
    $CHROME_CMD \
        --user-data-dir="$profile_dir" \
        --profile-directory="$profile_name" \
        --load-extension="$extension_dir" \
        --new-window \
        "$url" \
        > /dev/null 2>&1 &
    
    echo -e "   ✅ Perfil: $profile_name"
    echo -e "   ✅ Auto-login configurado"
    echo -e "   ✅ El navegador iniciará sesión automáticamente"
    echo ""
}

# Abrir Chrome para Admin con auto-login
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ADMIN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
open_chrome_profile_with_login "Admin" "$ADMIN_PROFILE_DIR" "$LOGIN_URL" "Admin" "$ADMIN_EMAIL" "$PASSWORD"

# Esperar un poco antes de abrir el segundo perfil
sleep 3

# Abrir Chrome para Usuario con auto-login
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  USUARIO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
open_chrome_profile_with_login "User" "$USER_PROFILE_DIR" "$LOGIN_URL" "Usuario" "$USER_EMAIL" "$PASSWORD"

echo -e "${GREEN}✅ Chrome abierto con dos perfiles${NC}"
echo ""
echo -e "${YELLOW}📝 Instrucciones:${NC}"
echo -e "   1. En cada ventana de Chrome, inicia sesión con:"
echo -e "      ${BLUE}Admin:${NC}  $ADMIN_EMAIL / $PASSWORD"
echo -e "      ${BLUE}Usuario:${NC} $USER_EMAIL / $PASSWORD"
echo ""
if [ -n "$ADMIN_EMAIL" ] && [ "$ADMIN_EMAIL" != "admin@runnercoach.test" ]; then
    echo -e "   ${GREEN}✅ Credenciales obtenidas automáticamente${NC}"
fi
echo ""
echo -e "   2. Los perfiles están guardados en:"
echo -e "      ${BLUE}Admin:${NC}  $ADMIN_PROFILE_DIR"
echo -e "      ${BLUE}Usuario:${NC} $USER_PROFILE_DIR"
echo ""
echo -e "   3. Para especificar emails manualmente, usa:"
echo -e "      ${BLUE}ADMIN_EMAIL='email@runnercoach.test' USER_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers-auto.sh${NC}"
echo ""
echo -e "${GREEN}✨ Listo para pruebas!${NC}"
