import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient, User, Session, SupabaseClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

const DEFAULT_SUPABASE_URL = "https://vupaaywgmcrlghfvwzqq.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cGFheXdnbWNybGdoZnZ3enFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODE0ODgsImV4cCI6MjEwMDc1NzQ4OH0.C2v7APWCTb74aDIi23CvQ8ClZXTYm6Obs8Gipr-DQXQ";

export function formatSupabaseUrl(inputUrl?: string): string {
  let url = inputUrl?.trim();
  if (!url) {
    return DEFAULT_SUPABASE_URL;
  }
  // Strip trailing /rest/v1 if present
  url = url.replace(/\/rest\/v1\/?$/, "");
  // Ensure protocol
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  // Remove trailing slashes
  url = url.replace(/\/+$/, "");
  return /^https?:\/\/.+/i.test(url) ? url : DEFAULT_SUPABASE_URL;
}

export function formatSupabaseKey(inputKey?: string): string {
  const key = inputKey?.trim();
  return key || DEFAULT_SUPABASE_KEY;
}

// Retrieve keys from environment variables (NEXT_PUBLIC_*, VITE_*, or SUPABASE_*)
const rawUrl =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const rawKey =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" && process.env?.SUPABASE_ANON_KEY) ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_KEY;

export const SUPABASE_URL = formatSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = formatSupabaseKey(rawKey);

// Safe Supabase Client instance initialized with persisted session strategy
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Checks connection status to Supabase database instance.
 */
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from("_health_check_dummy").select("*").limit(1);
    if (error && error.code !== "PGRST301" && error.code !== "42P01") {
      return { connected: true, message: "Conectado ao Supabase (" + SUPABASE_URL + ")", error: error.message };
    }
    return { connected: true, message: "Conexão ativa com o Supabase (" + SUPABASE_URL + ")" };
  } catch (err: any) {
    return { connected: false, message: "Erro ao conectar ao Supabase: " + (err.message || String(err)) };
  }
}

// ==========================================
// Authentication Context & Provider
// ==========================================

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  supabase,
  signOut: async () => ({ error: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    supabase,
    signOut,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
};

// ==========================================
// Supabase Auth UI Component Wrapper
// ==========================================

export interface SupabaseAuthUIProps {
  appearance?: any;
  providers?: any[];
  theme?: string;
  view?: "sign_in" | "sign_up" | "magic_link" | "forget_password";
  redirectTo?: string;
  showLinks?: boolean;
}

export const SupabaseAuthUI: React.FC<SupabaseAuthUIProps> = ({
  appearance = {
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: '#0d9488',
          brandAccent: '#0f766e',
        },
      },
    },
  },
  providers = ['google'],
  theme = 'default',
  view = 'sign_in',
  redirectTo,
  showLinks = true,
}) => {
  return React.createElement(Auth, {
    supabaseClient: supabase,
    appearance,
    providers,
    theme,
    view,
    redirectTo,
    showLinks,
    localization: {
      variables: {
        sign_in: {
          email_label: 'Endereço de E-mail',
          password_label: 'Palavra-passe (Senha)',
          button_label: 'Entrar',
          loading_button_label: 'Autenticando...',
          social_provider_text: 'Entrar com {{provider}}',
          link_text: 'Já tem uma conta? Entre',
        },
        sign_up: {
          email_label: 'Endereço de E-mail',
          password_label: 'Criar Palavra-passe',
          button_label: 'Cadastrar',
          loading_button_label: 'Cadastrando...',
          social_provider_text: 'Cadastrar com {{provider}}',
          link_text: 'Não tem uma conta? Cadastre-se',
        },
        forgotten_password: {
          email_label: 'Endereço de E-mail',
          password_label: 'Sua palavra-passe',
          button_label: 'Enviar instruções de redefinição',
          loading_button_label: 'Enviando instruções...',
          link_text: 'Esqueceu a palavra-passe?',
        },
      },
    },
  });
};



