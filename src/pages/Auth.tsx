import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Email inválido').max(255, 'Email muito longo');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa');

type Step = 'email' | 'create-password' | 'login' | 'reset-password';

interface WebhookData {
  buyerName: string | null;
  productName: string | null;
}

export default function Auth() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
          description: 'Este email não possui acesso. É necessário realizar uma compra primeiro.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Email is valid - check if user already has an account by trying to sign in
      setWebhookData({
        buyerName: webhooks[0].buyer_name,
        productName: webhooks[0].product_name,
      });

      // Check if user exists in auth by checking profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      // Also try to check if user can sign in (more reliable)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: 'test_if_user_exists_dummy_password_12345',
      });

      // If error is "Invalid login credentials", user exists but password is wrong
      // If error is something else or no error, user may not exist
      const userExists = signInError?.message?.includes('Invalid login credentials') || profile?.user_id;

      if (userExists) {
        // User already has an account - go to login
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

      if (password !== confirmPassword) {
        toast({
          title: 'Erro de validação',
          description: 'As senhas não coincidem.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create new user account with signUp
      const { error: signUpError } = await signUp(email, password, webhookData?.buyerName || undefined);

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
        redirectTo: `${window.location.origin}/auth?reset=true`,
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

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-lg brand-gradient flex items-center justify-center">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <span className="text-2xl font-bold brand-gradient-text">Drama_Flix</span>
        </Link>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl p-8">
          {/* Step 1: Email Validation */}
          {step === 'email' && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Acessar Conta</h1>
              <p className="text-muted-foreground text-center mb-6">
                Digite seu email para verificar seu acesso
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full brand-gradient" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Observação:</strong> Apenas usuários com compra aprovada podem acessar a plataforma.
                </p>
              </div>
            </>
          )}

          {/* Step 2: Create Password (First Access) */}
          {step === 'create-password' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-center mb-2">Primeiro Acesso</h1>
              <p className="text-muted-foreground text-center mb-2">
                {webhookData?.buyerName && (
                  <span className="block text-foreground font-medium">
                    Olá, {webhookData.buyerName}!
                  </span>
                )}
                Crie sua senha para acessar a plataforma
              </p>
              {webhookData?.productName && (
                <p className="text-xs text-primary text-center mb-6">
                  Acesso: {webhookData.productName}
                </p>
              )}

              <form onSubmit={handleCreatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-display">Email</Label>
                  <Input
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Criar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
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
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full brand-gradient" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Senha e Entrar'
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
            </>
          )}

          {/* Step 3: Login (Returning User) */}
          {step === 'login' && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Bem-vindo de volta!</h1>
              <p className="text-muted-foreground text-center mb-6">
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
                    className="bg-muted"
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
                      className="pl-10 pr-10"
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

                <Button type="submit" className="w-full brand-gradient" disabled={isLoading}>
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
            </>
          )}

          {/* Step 4: Reset Password */}
          {step === 'reset-password' && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Recuperar Senha</h1>
              <p className="text-muted-foreground text-center mb-6">
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
                    className="bg-muted"
                  />
                </div>

                <Button type="submit" className="w-full brand-gradient" disabled={isLoading}>
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
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
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
