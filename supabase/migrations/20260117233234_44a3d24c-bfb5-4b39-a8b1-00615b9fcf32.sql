-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum para status de assinatura
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'pending', 'cancelled');

-- Enum para tipo de plano
CREATE TYPE public.plan_type AS ENUM ('monthly', 'annual');

-- Enum para categoria de conteúdo
CREATE TYPE public.content_category AS ENUM ('doramas', 'adult', 'novelas', 'filmes', 'series');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_status subscription_status NOT NULL DEFAULT 'inactive',
    plan_type plan_type,
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    is_vip BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Tabela de planos de assinatura
CREATE TABLE public.subscription_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    plan_type plan_type NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    features JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conteúdos (filmes, séries, doramas, etc)
CREATE TABLE public.contents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category content_category NOT NULL,
    cover_image_url TEXT,
    banner_image_url TEXT,
    rating DECIMAL(3, 1) DEFAULT 0,
    release_year INTEGER,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_trending BOOLEAN NOT NULL DEFAULT false,
    is_new BOOLEAN NOT NULL DEFAULT false,
    is_adult BOOLEAN NOT NULL DEFAULT false,
    total_episodes INTEGER DEFAULT 1,
    duration_minutes INTEGER,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de episódios
CREATE TABLE public.episodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(content_id, episode_number)
);

-- Tabela de webhooks de compra (mensal e anual)
CREATE TABLE public.purchase_webhooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type plan_type NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_document TEXT,
    product_id TEXT,
    product_name TEXT,
    transaction_id TEXT,
    payment_method TEXT,
    payment_status TEXT,
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'BRL',
    raw_data JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de lista do usuário (minha lista)
CREATE TABLE public.user_watchlist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_id UUID REFERENCES public.contents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);

-- Tabela de progresso de visualização
CREATE TABLE public.watch_progress (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    progress_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, episode_id)
);

-- Tabela de presença online (para usuários ativos em tempo real)
CREATE TABLE public.online_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_online BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contents_updated_at
    BEFORE UPDATE ON public.contents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON public.episodes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Profiles: usuários podem ver e editar seu próprio perfil, admins podem ver todos
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User Roles: apenas admins podem gerenciar roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Subscription Plans: todos podem ver planos ativos
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Contents: usuários com assinatura ativa podem ver, admins podem gerenciar
CREATE POLICY "Subscribers can view content" ON public.contents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND (profiles.subscription_status = 'active' OR profiles.is_vip = true)
        )
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can manage content" ON public.contents
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Episodes: mesma lógica de contents
CREATE POLICY "Subscribers can view episodes" ON public.episodes
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = auth.uid() 
            AND (profiles.subscription_status = 'active' OR profiles.is_vip = true)
        )
        OR public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can manage episodes" ON public.episodes
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Purchase Webhooks: apenas admins podem ver
CREATE POLICY "Admins can view webhooks" ON public.purchase_webhooks
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage webhooks" ON public.purchase_webhooks
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User Watchlist: usuários podem gerenciar sua própria lista
CREATE POLICY "Users can manage own watchlist" ON public.user_watchlist
    FOR ALL USING (auth.uid() = user_id);

-- Watch Progress: usuários podem gerenciar seu próprio progresso
CREATE POLICY "Users can manage own progress" ON public.watch_progress
    FOR ALL USING (auth.uid() = user_id);

-- Online Users: usuários autenticados podem ver usuários online
CREATE POLICY "Authenticated can view online users" ON public.online_users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own presence" ON public.online_users
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all online users" ON public.online_users
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Função para criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir planos padrão
INSERT INTO public.subscription_plans (name, description, plan_type, price, features) VALUES
    ('Plano Mensal', 'Acesso completo a todo o catálogo por 1 mês', 'monthly', 29.90, '{"unlimited_access": true, "hd_quality": true, "multiple_devices": 2}'),
    ('Plano Anual', 'Acesso completo a todo o catálogo por 1 ano com desconto', 'annual', 239.90, '{"unlimited_access": true, "hd_quality": true, "multiple_devices": 5, "priority_support": true}');

-- Enable realtime para usuários online
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_users;