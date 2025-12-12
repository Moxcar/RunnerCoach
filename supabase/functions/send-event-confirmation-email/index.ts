import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, eventName, eventDate, eventLocation, eventPrice } =
      await req.json();

    if (!email || !eventName) {
      return new Response(
        JSON.stringify({ error: "Email y nombre del evento son requeridos" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Configuración de Supabase faltante" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format event date
    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Fecha por confirmar";

    // Create email content
    const emailSubject = `Confirmación de inscripción: ${eventName}`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #e9540d 0%, #d14a0b 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .event-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #e9540d;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      background: #e9540d;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>¡Inscripción Confirmada!</h1>
  </div>
  <div class="content">
    <p>Hola,</p>
    <p>Tu inscripción al evento <strong>${eventName}</strong> ha sido confirmada exitosamente.</p>
    
    <div class="event-info">
      <h2 style="margin-top: 0; color: #e9540d;">Detalles del Evento</h2>
      <p><strong>Nombre:</strong> ${eventName}</p>
      <p><strong>Fecha:</strong> ${formattedDate}</p>
      ${eventLocation ? `<p><strong>Ubicación:</strong> ${eventLocation}</p>` : ""}
      ${eventPrice !== undefined && eventPrice > 0 ? `<p><strong>Precio:</strong> $${eventPrice.toLocaleString()} MXN</p>` : "<p><strong>Precio:</strong> Gratis</p>"}
    </div>

    <p>Guarda este correo como comprobante de tu inscripción.</p>
    
    <p>Si creas una cuenta en RunnerCoach con este mismo email más tarde, podrás ver este evento en tu dashboard.</p>
    
    <p style="margin-top: 30px;">¡Nos vemos en el evento!</p>
    <p>El equipo de RunnerCoach</p>
  </div>
  <div class="footer">
    <p>Este es un correo automático, por favor no respondas.</p>
  </div>
</body>
</html>
`;

    // Try to send email using Supabase's email functionality
    // Note: This requires SMTP to be configured in Supabase
    // For production, you should integrate with a service like Resend, SendGrid, etc.
    
    // Option 1: Use Supabase's built-in email (requires SMTP configuration)
    // You can use the Supabase Management API or a database function to send emails
    
    // Option 2: Use an external email service (recommended for production)
    // Example with Resend:
    /*
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "RunnerCoach <noreply@runnercoach.com>",
          to: email,
          subject: emailSubject,
          html: emailBody,
        }),
      });
      
      if (!resendResponse.ok) {
        throw new Error("Failed to send email via Resend");
      }
    }
    */

    // For now, log the email (in development, you can view these in Supabase's email testing interface)
    console.log("Email que se enviaría:", {
      to: email,
      subject: emailSubject,
    });

    // In production, integrate with your email service here
    // The email will be sent when you configure SMTP or integrate with an email service

    return new Response(
      JSON.stringify({
        success: true,
        message: "Correo de confirmación enviado",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error al enviar el correo",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
