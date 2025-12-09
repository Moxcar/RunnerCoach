#!/bin/bash

# Script para abrir Chrome con perfiles de coach y cliente para pruebas
# Este script abre dos ventanas de Chrome con perfiles separados

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL de la aplicación (ajusta si es diferente)
APP_URL="${APP_URL:-http://localhost:5173}"
LOGIN_URL="${APP_URL}/login"

# Directorios para perfiles de Chrome
COACH_PROFILE_DIR="$HOME/.config/google-chrome-coach"
CLIENT_PROFILE_DIR="$HOME/.config/google-chrome-client"

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

PASSWORD="password123"

# Función para obtener credenciales de la base de datos
get_credentials_from_db() {
    local db_password="${SUPABASE_DB_PASSWORD:-}"
    local supabase_url="${VITE_SUPABASE_URL:-}"
    
    if [ -z "$db_password" ] || [ -z "$supabase_url" ]; then
        echo -e "${YELLOW}⚠️  No se encontraron credenciales de base de datos en .env${NC}"
        echo -e "${YELLOW}   Asegúrate de que .env tenga SUPABASE_DB_PASSWORD y VITE_SUPABASE_URL${NC}"
        return 1
    fi
    
    # Verificar si psql está disponible
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  psql no está instalado. No se pueden obtener credenciales automáticamente${NC}"
        echo -e "${YELLOW}   Instala con: sudo apt-get install -y postgresql-client${NC}"
        return 1
    fi
    
    # Extraer el project-ref de la URL
    local project_ref=$(echo "$supabase_url" | sed -E 's|https?://([^.]+).*|\1|')
    local db_host="db.${project_ref}.supabase.co"
    
    echo -e "${BLUE}🔍 Obteniendo credenciales de la base de datos...${NC}"
    echo -e "${BLUE}   Conectando a: $db_host${NC}"
    
    # Función auxiliar para ejecutar query
    run_query() {
        local query=$1
        local result=""
        local error_output=""
        local has_error=false
        
        # Intentar con pooler primero (puerto 6543)
        error_output=$(PGPASSWORD="$db_password" psql -h "$db_host" -U "postgres.${project_ref}" -d postgres -p 6543 -t -A -c "$query" 2>&1)
        
        # Verificar si hay errores de conexión
        if echo "$error_output" | grep -qiE "error|fatal|could not connect|network is unreachable|connection refused|is the server running"; then
            has_error=true
        else
            # Extraer solo las líneas que parecen ser resultados (no mensajes de error)
            result=$(echo "$error_output" | grep -vE "^psql:|^FATAL:|^ERROR:|^WARNING:" | grep "@" | head -1 | tr -d '[:space:]')
        fi
        
        # Si falla o hay error, intentar con conexión directa (puerto 5432)
        if [ "$has_error" = true ] || [ -z "$result" ] || [ "$result" = "" ]; then
            error_output=$(PGPASSWORD="$db_password" psql -h "$db_host" -U "postgres" -d postgres -p 5432 -t -A -c "$query" 2>&1)
            
            # Verificar si hay errores de conexión
            if echo "$error_output" | grep -qiE "error|fatal|could not connect|network is unreachable|connection refused|is the server running"; then
                has_error=true
                result=""
            else
                result=$(echo "$error_output" | grep -vE "^psql:|^FATAL:|^ERROR:|^WARNING:" | grep "@" | head -1 | tr -d '[:space:]')
            fi
        fi
        
        # Si hay errores, mostrarlos y retornar vacío
        if [ "$has_error" = true ]; then
            local error_msg=$(echo "$error_output" | grep -iE "error|fatal|could not connect|network is unreachable|connection refused|is the server running" | head -1)
            if [ -n "$error_msg" ]; then
                echo -e "${YELLOW}   ⚠️  Error de conexión: ${error_msg}${NC}" >&2
            fi
            echo ""
            return 1
        fi
        
        # Validar que el resultado sea un email válido
        if [[ "$result" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            echo "$result"
            return 0
        else
            echo ""
            return 1
        fi
    }
    
    # Intentar obtener email del coach
    if [ -z "$COACH_EMAIL" ]; then
        local coach_query="SELECT u.email FROM auth.users u JOIN user_profiles up ON u.id = up.id WHERE up.role = 'coach' LIMIT 1;"
        COACH_EMAIL=$(run_query "$coach_query")
        
        if [ -n "$COACH_EMAIL" ] && [[ "$COACH_EMAIL" =~ @ ]]; then
            echo -e "${GREEN}✅ Coach encontrado: $COACH_EMAIL${NC}"
        else
            echo -e "${YELLOW}⚠️  No se pudo obtener email del coach de la base de datos${NC}"
            COACH_EMAIL=""
        fi
    fi
    
    # Intentar obtener email de un cliente
    if [ -z "$CLIENT_EMAIL" ]; then
        local client_query="SELECT u.email FROM auth.users u JOIN user_profiles up ON u.id = up.id WHERE up.role = 'client' LIMIT 1;"
        CLIENT_EMAIL=$(run_query "$client_query")
        
        if [ -n "$CLIENT_EMAIL" ] && [[ "$CLIENT_EMAIL" =~ @ ]]; then
            echo -e "${GREEN}✅ Cliente encontrado: $CLIENT_EMAIL${NC}"
        else
            echo -e "${YELLOW}⚠️  No se pudo obtener email de cliente de la base de datos${NC}"
            CLIENT_EMAIL=""
        fi
    fi
    
    # Si se obtuvieron ambas credenciales, retornar éxito
    if [ -n "$COACH_EMAIL" ] && [ -n "$CLIENT_EMAIL" ]; then
        return 0
    else
        return 1
    fi
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

# Obtener emails de coach y cliente
COACH_EMAIL="${COACH_EMAIL:-}"
CLIENT_EMAIL="${CLIENT_EMAIL:-}"

# Si no se proporcionaron emails, intentar obtenerlos de la base de datos
if [ -z "$COACH_EMAIL" ] || [ -z "$CLIENT_EMAIL" ]; then
    if ! get_credentials_from_db; then
        echo -e "${YELLOW}💡 No se pudieron obtener credenciales automáticamente desde la BD${NC}"
        echo -e "${YELLOW}   Esto es común desde WSL debido a problemas de red${NC}"
        echo ""
        echo -e "${BLUE}📋 Para obtener credenciales manualmente:${NC}"
        echo -e "   1. Ve a: https://app.supabase.com/project/ngtxialivasllpzjwzen/sql/new"
        echo -e "   2. Ejecuta este SQL:"
        echo ""
        echo -e "${GREEN}   -- Obtener email del coach${NC}"
        echo -e "${BLUE}   SELECT u.email FROM auth.users u${NC}"
        echo -e "${BLUE}   JOIN user_profiles up ON u.id = up.id${NC}"
        echo -e "${BLUE}   WHERE up.role = 'coach' LIMIT 1;${NC}"
        echo ""
        echo -e "${GREEN}   -- Obtener email de un cliente${NC}"
        echo -e "${BLUE}   SELECT u.email FROM auth.users u${NC}"
        echo -e "${BLUE}   JOIN user_profiles up ON u.id = up.id${NC}"
        echo -e "${BLUE}   WHERE up.role = 'client' LIMIT 1;${NC}"
        echo ""
        echo -e "   3. Luego ejecuta:"
        echo -e "      ${BLUE}COACH_EMAIL='email@runnercoach.test' CLIENT_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers.sh${NC}"
        echo ""
    fi
fi

# Si aún no hay emails válidos, validar y mostrar advertencia
if [ -z "$COACH_EMAIL" ] || ! validate_email "$COACH_EMAIL"; then
    if [ -n "$COACH_EMAIL" ] && ! validate_email "$COACH_EMAIL"; then
        echo -e "${YELLOW}⚠️  Email de coach inválido obtenido de BD: '$COACH_EMAIL'${NC}"
    else
        echo -e "${YELLOW}⚠️  No se especificó COACH_EMAIL y no se pudo obtener de la BD${NC}"
    fi
    echo -e "${YELLOW}   Para obtener el email, ejecuta en Supabase SQL Editor:${NC}"
    echo -e "${BLUE}   SELECT u.email FROM auth.users u JOIN user_profiles up ON u.id = up.id WHERE up.role = 'coach' LIMIT 1;${NC}"
    echo -e "${YELLOW}   Luego usa: COACH_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers.sh${NC}"
    COACH_EMAIL=""
fi

if [ -z "$CLIENT_EMAIL" ] || ! validate_email "$CLIENT_EMAIL"; then
    if [ -n "$CLIENT_EMAIL" ] && ! validate_email "$CLIENT_EMAIL"; then
        echo -e "${YELLOW}⚠️  Email de cliente inválido obtenido de BD: '$CLIENT_EMAIL'${NC}"
    else
        echo -e "${YELLOW}⚠️  No se especificó CLIENT_EMAIL y no se pudo obtener de la BD${NC}"
    fi
    echo -e "${YELLOW}   Para obtener el email, ejecuta en Supabase SQL Editor:${NC}"
    echo -e "${BLUE}   SELECT u.email FROM auth.users u JOIN user_profiles up ON u.id = up.id WHERE up.role = 'client' LIMIT 1;${NC}"
    echo -e "${YELLOW}   Luego usa: CLIENT_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers.sh${NC}"
    CLIENT_EMAIL=""
fi

# Si no hay emails válidos, no continuar
if [ -z "$COACH_EMAIL" ] || [ -z "$CLIENT_EMAIL" ]; then
    echo ""
    echo -e "${YELLOW}❌ No se pueden abrir los navegadores sin emails válidos${NC}"
    echo -e "${YELLOW}   Por favor, proporciona los emails manualmente o ejecuta el SQL en Supabase${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📧 Credenciales:${NC}"
echo -e "   Coach:  ${BLUE}$COACH_EMAIL${NC} / $PASSWORD"
echo -e "   Cliente: ${BLUE}$CLIENT_EMAIL${NC} / $PASSWORD"
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

# Función para crear URL con JavaScript inyectado (método alternativo)
create_auto_login_url() {
    local email=$1
    local password=$2
    local base_url=$3
    
    # Crear JavaScript codificado para inyectar
    local js_code="
    (function() {
        setTimeout(function() {
            const emailInput = document.querySelector('input[type=\"email\"]');
            const passwordInput = document.querySelector('input[type=\"password\"]');
            const submitButton = document.querySelector('button[type=\"submit\"]');
            if (emailInput && passwordInput && submitButton) {
                emailInput.value = '$email';
                passwordInput.value = '$password';
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(function() { submitButton.click(); }, 500);
            }
        }, 2000);
    })();
    "
    
    # Codificar para data URL (método alternativo: usar bookmarklet)
    echo "$base_url"
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
    
    # Crear script de auto-login
    local script_path=$(create_auto_login_script "$email" "$password" "$profile_name")
    
    # Intentar usar Playwright si está disponible (método preferido)
    local use_playwright=false
    if command -v node &> /dev/null && [ -f "$PROJECT_DIR/package.json" ]; then
        if npm list playwright --prefix "$PROJECT_DIR" &> /dev/null 2>&1 || npm list -g playwright &> /dev/null 2>&1; then
            use_playwright=true
        fi
    fi
    
    if [ "$use_playwright" = true ]; then
        echo -e "${BLUE}   🤖 Usando Playwright para login automático...${NC}"
        # Ejecutar Playwright en segundo plano
        cd "$PROJECT_DIR"
        node scripts/auto-login.js "$email" "$password" "$profile_dir" "$profile_name" > /tmp/playwright_${profile_name}.log 2>&1 &
        local playwright_pid=$!
        echo -e "   ✅ Playwright iniciado (PID: $playwright_pid)"
        echo -e "   📝 Logs en: /tmp/playwright_${profile_name}.log"
    else
        # Método alternativo: abrir Chrome y mostrar instrucciones
        $CHROME_CMD \
            --user-data-dir="$profile_dir" \
            --profile-directory="$profile_name" \
            --new-window \
            "$url" \
            > /dev/null 2>&1 &
        
        echo -e "   ✅ Perfil: $profile_name"
        echo -e "   ✅ URL: $url"
        echo -e "   ✅ Script de auto-login creado: $script_path"
        echo ""
        echo -e "${YELLOW}   💡 Para auto-login rápido:${NC}"
        echo -e "      1. Abre la consola del navegador (F12)"
        echo -e "      2. Ve a la pestaña Console"
        echo -e "      3. Copia y pega el contenido de: ${BLUE}$script_path${NC}"
        echo -e "      4. Presiona Enter"
        echo ""
        echo -e "${YELLOW}   💡 Para login completamente automático, instala Playwright:${NC}"
        echo -e "      ${BLUE}cd $PROJECT_DIR && npm install -D playwright && npx playwright install chromium${NC}"
    fi
    
    echo ""
}

# Función para abrir Chrome con un perfil específico (versión simple)
open_chrome_profile() {
    local profile_name=$1
    local profile_dir=$2
    local url=$3
    local label=$4
    
    echo -e "${GREEN}Abriendo Chrome - ${label}...${NC}"
    
    $CHROME_CMD \
        --user-data-dir="$profile_dir" \
        --profile-directory="$profile_name" \
        --new-window \
        "$url" \
        > /dev/null 2>&1 &
    
    echo -e "   ✅ Perfil: $profile_name"
    echo -e "   ✅ URL: $url"
    echo ""
}

# Abrir Chrome para Coach con auto-login
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  COACH${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
open_chrome_profile_with_login "Coach" "$COACH_PROFILE_DIR" "$LOGIN_URL" "Coach" "$COACH_EMAIL" "$PASSWORD"

# Esperar un poco antes de abrir el segundo perfil
sleep 3

# Abrir Chrome para Cliente con auto-login
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  CLIENTE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
open_chrome_profile_with_login "Client" "$CLIENT_PROFILE_DIR" "$LOGIN_URL" "Cliente" "$CLIENT_EMAIL" "$PASSWORD"

echo -e "${GREEN}✅ Chrome abierto con dos perfiles${NC}"
echo ""
echo -e "${YELLOW}📝 Instrucciones:${NC}"
echo -e "   1. En cada ventana de Chrome, inicia sesión con:"
echo -e "      ${BLUE}Coach:${NC}  $COACH_EMAIL / $PASSWORD"
echo -e "      ${BLUE}Cliente:${NC} $CLIENT_EMAIL / $PASSWORD"
echo ""
if [ -n "$COACH_EMAIL" ] && [ "$COACH_EMAIL" != "coach@runnercoach.test" ]; then
    echo -e "   ${GREEN}✅ Credenciales obtenidas automáticamente de la base de datos${NC}"
fi
echo ""
echo -e "   2. Los perfiles están guardados en:"
echo -e "      ${BLUE}Coach:${NC}  $COACH_PROFILE_DIR"
echo -e "      ${BLUE}Cliente:${NC} $CLIENT_PROFILE_DIR"
echo ""
echo -e "   3. Para especificar emails manualmente, usa:"
echo -e "      ${BLUE}COACH_EMAIL='email@runnercoach.test' CLIENT_EMAIL='email@runnercoach.test' ./scripts/open-test-browsers.sh${NC}"
echo ""
echo -e "${GREEN}✨ Listo para pruebas!${NC}"

