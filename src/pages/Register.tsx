import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateRegistrationTokenWithType,
  incrementLinkUsage,
} from "@/services/registrationLinks";
import { supabase } from "@/lib/supabase";
import logo from "/logo.svg";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationToken, setRegistrationToken] = useState<string | null>(
    null
  );
  const [coachId, setCoachId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<'client' | 'coach' | null>(null);
  const { signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Detectar token en la URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setRegistrationToken(token);
      // Validar token y obtener coach_id y tipo de enlace
      validateRegistrationTokenWithType(token)
        .then((result) => {
          if (result.coachId !== null || result.linkType === 'coach') {
            setCoachId(result.coachId);
            setLinkType(result.linkType);
          } else {
            setError("El enlace de registro no es válido o ha expirado");
          }
        })
        .catch(() => {
          setError("Error al validar el enlace de registro");
        });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Determinar el rol según el tipo de enlace
      let userRole: "admin" | "coach" | "user" = "user";
      if (linkType === "coach") {
        userRole = "coach";
      }

      await signUp(email, password, name, userRole);

      // Si hay un token de registro válido
      if (registrationToken) {
        try {
          // Esperar un momento para que se cree el perfil
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Obtener el usuario recién creado
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            if (linkType === "coach") {
              // Para coaches, actualizar el perfil para que esté pendiente de aprobación
              const { error: profileError } = await supabase
                .from("user_profiles")
                .update({ is_approved: false })
                .eq("id", user.id);

              if (profileError) {
                console.error("Error actualizando perfil de coach:", profileError);
              } else {
                // Incrementar contador de uso del enlace
                await incrementLinkUsage(registrationToken);
              }
            } else if (linkType === "client" && coachId) {
              // Para clientes, crear registro en clients con el coach asignado
              const { error: clientError } = await supabase
                .from("clients")
                .insert({
                  user_id: user.id,
                  coach_id: coachId,
                  name: name,
                  email: email,
                  phone: "",
                  payment_status: "pending",
                });

              if (clientError) {
                console.error("Error asignando coach:", clientError);
                // No lanzamos error, el admin puede asignar después
              } else {
                // Incrementar contador de uso del enlace
                await incrementLinkUsage(registrationToken);
              }
            }
          }
        } catch (assignError) {
          console.error("Error en asignación automática:", assignError);
          // No bloqueamos el registro si falla la asignación
        }
      }

      // La redirección se manejará automáticamente por RedirectIfAuthenticated
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Error al registrarse con Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <img src={logo} alt="RunnerCoach" className="h-16 mx-auto mb-4" />
            <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
            <CardDescription>
              {linkType === "coach"
                ? "Te estás registrando como coach. Tu cuenta estará pendiente de aprobación por el administrador."
                : coachId
                ? "Te estás registrando con un enlace de invitación. Serás asignado automáticamente a tu coach."
                : "Únete a la comunidad de runners y comienza tu viaje hacia tus metas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Registrarme"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">O</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
              >
                Continuar con Google
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
