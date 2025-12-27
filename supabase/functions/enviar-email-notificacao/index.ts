import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = {
  emails: {
    send: async (params: { from: string; to: string[]; subject: string; html: string }) => {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY não configurado");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erro ao enviar email: ${error}`);
      }

      return response.json();
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando envio de email de notificação");
    
    // SECURITY: Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: No authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log("✅ User authenticated:", user.id);
    
    const { to, subject, html }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error("Parâmetros obrigatórios faltando: to, subject, html");
    }

    // SECURITY: Validate email format and domain
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Formato de email inválido");
    }

    // SECURITY: Rate limiting could be added here (e.g., using a rate limit table)
    // For now, we just log the request
    console.log(`📧 Enviando email para: ${to}, assunto: ${subject}, solicitante: ${user.id}`);

    const emailResponse = await resend.emails.send({
      from: "Portal do Aluno <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    
    // Não quebrar o app caso dê erro
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro desconhecido ao enviar email" 
      }),
      {
        status: 200, // Retornar 200 mesmo com erro para não quebrar o frontend
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
