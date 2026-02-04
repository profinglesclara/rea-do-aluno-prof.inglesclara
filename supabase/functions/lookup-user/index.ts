import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return new Response(
        JSON.stringify({ error: "Identificador inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS - this function only returns email for login
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Try to find user by username first
    let { data: usuario, error } = await supabaseAdmin
      .from("usuarios")
      .select("email, tipo_usuario")
      .eq("nome_de_usuario", identifier)
      .maybeSingle();

    if (error) {
      console.error("Error looking up by username:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If not found by username, try by email
    if (!usuario) {
      const { data: byEmail, error: emailError } = await supabaseAdmin
        .from("usuarios")
        .select("email, tipo_usuario")
        .eq("email", identifier)
        .maybeSingle();

      if (emailError) {
        console.error("Error looking up by email:", emailError);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar usuário" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      usuario = byEmail;
    }

    // If still not found, return not found (but don't reveal if user exists or not for security)
    if (!usuario) {
      return new Response(
        JSON.stringify({ found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only the email needed for Supabase Auth login
    return new Response(
      JSON.stringify({ 
        found: true, 
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
