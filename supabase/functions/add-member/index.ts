import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Adicionando membro:', email);

    // Generate random password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    // Create user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name || '',
      },
    });

    if (createError) {
      console.error('Erro ao criar usuário:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with name if provided
    if (newUser?.user && name) {
      await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('user_id', newUser.user.id);
    }

    console.log('Membro adicionado com sucesso:', email);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser?.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
