import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle, ArrowRight, Loader2, User, Sparkles, ArrowLeft } from 'lucide-react';
import dramaflixLogo from '@/assets/dramaflix-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Email inválido').max(255, 'Email muito longo');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa');

type Step = 'email' | 'create-password' | 'login' | 'reset-password' | 'update-password';

interface WebhookData {
  buyerName: string | null;
  productName: string | null;
}

export default function Auth() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Prefill email from querystring (?email=...) for faster access
  useEffect(() => {
    const hash = window.location.hash || '';
    const url = new URL(window.location.href);
    const isRecovery =
      hash.includes('type=recovery') ||
      url.searchParams.get('type') === 'recovery' ||
      url.searchParams.get('reset') === 'true';

    if (isRecovery) return;
    if (email.trim()) return;

    const qpEmail = searchParams.get('email');
    if (!qpEmail) return;

    setEmail(qpEmail.trim().toLowerCase());
  }, [searchParams, email]);

  // If user comes from password recovery email, force "update-password" step
  useEffect(() => {
    const hash = window.location.hash || '';
    const url = new URL(window.location.href);
    const isRecovery = hash.includes('type=recovery') || url.searchParams.get('type') === 'recovery' || url.searchParams.get('reset') === 'true';

    if (!isRecovery) return;

    setStep('update-password');

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        const recoveredEmail = session?.user?.email;
        if (recoveredEmail) setEmail(recoveredEmail);
      }
    });

    // Best-effort: prefill email if session already available
    supabase.auth.getSession().then(({ data }) => {
      const recoveredEmail = data.session?.user?.email;
      if (recoveredEmail) setEmail(recoveredEmail);
    });

    return () => authSub.subscription.unsubscribe();
  }, []);

  // Step 1: Validate email against webhooks
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = emailSchema.safeParse(email);
      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Check if email exists in purchase_webhooks (any webhook, processed or not)
      const { data: webhooks, error: webhookError } = await supabase
        .from('purchase_webhooks')
        .select('buyer_name, product_name, processed')
        .eq('buyer_email', trimmedEmail)
        .limit(1);

      if (webhookError) {
        console.error('Error checking webhook:', webhookError);
        toast({
          title: 'Erro',
          description: 'Erro ao verificar acesso. Tente novamente.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (!webhooks || webhooks.length === 0) {
        toast({
          title: 'Acesso não autorizado',
          description: 'Apenas usuários compradores podem acessar. Adquira um plano para começar!',
          variant: 'destructive',
        });
        // Redirect to plans page after short delay
        setTimeout(() => {
          navigate('/planos');
        }, 2000);
        setIsLoading(false);
        return;
      }

      // Email is valid - check if user already has an account by trying to sign in
      setWebhookData({
        buyerName: webhooks[0].buyer_name,
        productName: webhooks[0].product_name,
      });
      
      // Pre-fill the name if available from webhook
      if (webhooks[0].buyer_name) {
        setFullName(webhooks[0].buyer_name);
      }

      // Check if user already has a profile (meaning they already created their account)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', trimmedEmail)
        .single();

      console.log('Profile check result:', existingProfile, profileError);

      // If profile exists with user_id, user already has an account - go to login
      // If no profile or profile error (PGRST116 = not found), user needs to create account
      if (existingProfile?.user_id) {
        setHasExistingAccount(true);
        setStep('login');
      } else {
        // First access - need to create account with password
        setHasExistingAccount(false);
        setStep('create-password');
      }

      setEmail(trimmedEmail);
    } catch (err) {
      console.error('Error in email validation:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Create password (first access) - Now creates a new account
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate name
      if (!fullName.trim()) {
        toast({
          title: 'Nome obrigatório',
          description: 'Por favor, informe seu nome completo.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast({
          title: 'Erro de validação',
          description: passwordValidation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }


      // Create new user account with signUp - use the name from form (user can edit)
      const { error: signUpError } = await signUp(email, password, fullName || webhookData?.buyerName || undefined);

      if (signUpError) {
        console.error('Error creating account:', signUpError);
        
        // Check if user already exists
        if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
          toast({
            title: 'Conta já existe',
            description: 'Este email já possui uma conta. Tente fazer login.',
            variant: 'destructive',
          });
          setStep('login');
          setIsLoading(false);
          return;
        }
        
        toast({
          title: 'Erro',
          description: 'Erro ao criar sua conta. Tente novamente.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Get the new user's ID and process any pending purchases
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        console.log('Processing pending purchases for new user:', sessionData.session.user.id);
        try {
          await supabase.functions.invoke('process-user-purchases', {
            body: { email, userId: sessionData.session.user.id }
          });
        } catch (purchaseErr) {
          console.error('Error processing purchases:', purchaseErr);
          // Continue anyway - purchases can be processed later
        }
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao Drama_Flix!',
      });
      navigate('/');
    } catch (err) {
      console.error('Error creating password:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Login (returning user)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast({
          title: 'Erro de validação',
          description: passwordValidation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(email, password);

      if (error) {
        let message = 'Erro ao fazer login. Tente novamente.';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Senha incorreta.';
        }
        toast({
          title: 'Erro',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/');
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Supabase recovery links provide tokens in the URL hash (#...type=recovery)
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        console.error('Error sending reset email:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao enviar email de recuperação. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        setStep('login');
      }
    } catch (err) {
      console.error('Error in password reset:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Password Update (when coming from recovery link)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast({
          title: 'Erro de validação',
          description: passwordValidation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'Erro de validação',
          description: 'As senhas não coincidem.',
          variant: 'destructive',
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({
          title: 'Link inválido ou expirado',
          description: 'Solicite novamente a recuperação de senha e tente de novo.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error('Error updating password:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar sua senha. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Senha atualizada!',
        description: 'Você já pode acessar normalmente.',
      });

      // Remove hash params after success (avoid looping back into update mode)
      window.history.replaceState({}, document.title, '/login');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle red glow behind logo area */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-72 h-72 bg-red-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img
              src={dramaflixLogo}
              alt="Dramaflix"
              className="w-32 h-32 md:w-36 md:h-36 rounded-2xl object-contain drop-shadow-[0_0_30px_rgba(220,38,38,0.35)]"
            />
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2 bg-gradient-to-r from-primary to-red-400 bg-clip-text text-transparent">
          Entretenimento Sem Limites
        </h1>
        <p className="text-xs md:text-base text-muted-foreground text-center mb-8">
          Milhares de conteúdos esperando por você
        </p>

        {/* Step 1: Email Validation */}
        {step === 'email' && (
          <>
            {/* Welcome badge */}
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/60 border border-border text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Bem-vindo!
              </span>
            </div>

            <h2 className="text-xl font-bold text-center mb-1">Acesse sua conta</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Digite seu email para continuar
            </p>

            {/* Form Card */}
            <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 mb-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl border-primary/30 focus:border-primary"
                  />
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl brand-gradient text-base font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Info box - buyers only */}
            <div className="mb-4 p-4 bg-muted/40 rounded-xl border border-border">
              <p className="text-sm text-muted-foreground text-center mb-1">
                <strong>Apenas compradores podem acessar.</strong>
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Ainda não tem acesso?{' '}
                <Link to="/planos" className="text-primary hover:underline font-medium">
                  Adquira seu plano aqui
                </Link>
              </p>
            </div>

            {/* Forgot password */}
            <div className="text-center mb-4">
              <button
                type="button"
                onClick={() => {
                  if (email.trim()) {
                    setEmail(email.trim().toLowerCase());
                    setStep('reset-password');
                  } else {
                    toast({
                      title: 'Email necessário',
                      description: 'Digite seu email primeiro para recuperar a senha.',
                      variant: 'destructive',
                    });
                  }
                }}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Back to home */}
            <div className="text-center">
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o início
              </Link>
            </div>
          </>
        )}

        {/* Step 2: Create Password (First Access) */}
        {step === 'create-password' && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6">
            {/* Header com ícone de sucesso */}
            <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 rounded-lg border border-amber-500/30">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Compra identificada!</h2>
                <p className="text-sm text-muted-foreground">Escolha sua senha abaixo</p>
              </div>
            </div>

            <form onSubmit={handleCreatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome completo
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-display" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted pr-10 h-12 rounded-xl"
                  />
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl brand-gradient text-base font-semibold mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Criar conta
                  </>
                )}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={handleBack}
                disabled={isLoading}
              >
                Voltar
              </Button>
            </form>
          </div>
        )}

        {/* Step 3: Login (Returning User) */}
        {step === 'login' && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-center mb-1">Bem-vindo de volta!</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Digite sua senha para continuar
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-login">Email</Label>
                <Input
                  id="email-login"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-login">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-login"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl brand-gradient text-base font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="flex flex-col gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-primary" 
                  onClick={() => setStep('reset-password')}
                  disabled={isLoading}
                >
                  Esqueci minha senha
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Usar outro email
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Reset Password */}
        {step === 'reset-password' && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-center mb-1">Recuperar Senha</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Enviaremos um link para redefinir sua senha
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input
                  id="email-reset"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted h-12 rounded-xl"
                />
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl brand-gradient text-base font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('login')}
                disabled={isLoading}
              >
                Voltar ao login
              </Button>
            </form>
          </div>
        )}

        {/* Step 5: Update Password (from recovery link) */}
        {step === 'update-password' && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-center mb-1">Criar nova senha</h2>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Defina sua nova senha para entrar imediatamente
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-recovery">Email</Label>
                <Input id="email-recovery" type="email" value={email || 'Carregando...'} disabled className="bg-muted h-12 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 h-12 rounded-xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 rounded-xl brand-gradient text-base font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  window.history.replaceState({}, document.title, '/auth');
                  setStep('login');
                }}
                disabled={isLoading}
              >
                Voltar ao login
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao acessar, você concorda com nossos{' '}
          <Link to="/termos" className="hover:underline">
            Termos de Uso
          </Link>
          {' '}e{' '}
          <Link to="/privacidade" className="hover:underline">
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
