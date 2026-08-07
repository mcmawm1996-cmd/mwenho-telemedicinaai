import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types.js";
import { safeJson } from "../utils.js";
import { Stethoscope, Shield, Users, Mail, ArrowRight, Activity, Plus, Phone, AlertCircle, Sparkles, CheckCircle2, X, Lock, Eye, EyeOff, ShieldCheck, CreditCard, KeyRound, HelpCircle, RotateCcw, UserPlus } from "lucide-react";
import mwenhoProKv from "../assets/images/mwenho_pro_kv_1785011106828.jpg";
import telemedFullBg from "../assets/images/telemed_full_bg_1785010631758.jpg";
import { useAuth, SupabaseAuthUI, supabase } from "../lib/supabase.js";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  specialties: any[];
}

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.78 21.56,11.1 21.35,11.1z" fill="#4285F4" />
      <path d="M12,20.6c2.43,0 4.47,-0.8 5.96,-2.18l-2.57,-2c-0.73,0.48 -1.66,0.78 -2.62,0.78 -2.02,0 -3.73,-1.36 -4.35,-3.2H5.66v2.1c1.28,2.55 3.92,4.5 7.11,4.5z" fill="#34A853" />
      <path d="M7.65,14.1c-0.16,-0.48 -0.25,-1 -0.25,-1.5s0.09,-1.02 0.25,-1.5V9h-2.1c-0.54,1.08 -0.85,2.3 -0.85,3.6s0.31,2.52 0.85,3.6L7.65,14.1z" fill="#FBBC05" />
      <path d="M12,6.1c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.34 14.43,2.5 12,2.5c-3.19,0 -5.83,1.95 -7.11,4.5l2.23,2.1c0.62,-1.84 2.33,-3.2 4.35,-3.2z" fill="#EA4335" />
    </g>
  </svg>
);

export default function LoginScreen({ onLoginSuccess, specialties }: LoginScreenProps) {
  const { session: supabaseSession } = useAuth();
  const [authMode, setAuthMode] = useState<"supabase" | "direct">("supabase");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (supabaseSession?.user) {
      const handleSupabaseSession = async () => {
        try {
          const userEmail = supabaseSession.user.email || "";
          if (userEmail) {
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: userEmail, role })
            });
            if (response.ok) {
              const data = await safeJson(response);
              onLoginSuccess(data.user);
              return;
            }
          }
          const appUser: User = {
            id: supabaseSession.user.id,
            email: userEmail || `${supabaseSession.user.id}@supabase.user`,
            name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.user_metadata?.name || (userEmail ? userEmail.split("@")[0] : "Usuário Registado"),
            role: role || UserRole.PATIENT,
            authProvider: "google",
            createdAt: new Date().toISOString()
          };
          onLoginSuccess(appUser);
        } catch (e) {
          console.error("Erro ao sincronizar sessão Supabase:", e);
        }
      };
      handleSupabaseSession();
    }
  }, [supabaseSession]);

  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState("");
  const [regRole, setRegRole] = useState<UserRole>(UserRole.PATIENT);
  
  // Patient specialized fields
  const [regDob, setRegDob] = useState("1995-05-12");
  const [regGender, setRegGender] = useState("Masculino");
  const [regProvince, setRegProvince] = useState("Luanda");
  const [regBloodType, setRegBloodType] = useState("O+");
  const [regAllergies, setRegAllergies] = useState("");

  // Doctor specialized fields
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("sp-1");
  const [crmNumber, setCrmNumber] = useState("");
  const [consultationFee, setConsultationFee] = useState(20000);
  const [regYearsExp, setRegYearsExp] = useState(5);
  const [regHospital, setRegHospital] = useState("Hospital Josina Machel / Luanda");
  const [regBio, setRegBio] = useState("");
  const [ormedDocName, setOrmedDocName] = useState("");
  const [ormedDocBase64, setOrmedDocBase64] = useState("");
  const [isReadingOrmedFile, setIsReadingOrmedFile] = useState(false);

  // Google Accounts Modal simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [customGoogleRole, setCustomGoogleRole] = useState<UserRole>(UserRole.PATIENT);
  const [isNewGoogleAccount, setIsNewGoogleAccount] = useState(false);
  const [googleStep, setGoogleStep] = useState<"choose" | "create">("choose");

  // Admin Modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("admin@mwenho.ao");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  // Forgot Password Modal state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [resetEmailOrPhone, setResetEmailOrPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"request" | "verify" | "success">("request");
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState("");
  const [forgotPasswordErr, setForgotPasswordErr] = useState("");
  const [generatedCodeDisplay, setGeneratedCodeDisplay] = useState("");

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailOrPhone.trim()) {
      setForgotPasswordErr("Por favor informe o seu e-mail ou número de telefone.");
      return;
    }
    setLoading(true);
    setForgotPasswordErr("");
    setForgotPasswordMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: resetEmailOrPhone.trim() })
      });
      const data = await safeJson(res);
      if (res.ok) {
        setForgotPasswordStep("verify");
        setForgotPasswordMsg(`Código de verificação gerado com sucesso para ${data.userName || resetEmailOrPhone}.`);
        if (data.code) {
          setGeneratedCodeDisplay(data.code);
          setResetCode(data.code);
        }
      } else {
        setForgotPasswordErr(data.error || "Erro ao solicitar redefinição de palavra-passe.");
      }
    } catch (err) {
      console.error(err);
      setForgotPasswordErr("Erro de conexão ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setForgotPasswordErr("Por favor insira o código de verificação de 6 dígitos.");
      return;
    }
    if (!newPassword) {
      setForgotPasswordErr("Por favor digite a nova palavra-passe.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotPasswordErr("As palavras-passes informadas não coincidem.");
      return;
    }
    setLoading(true);
    setForgotPasswordErr("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrPhone: resetEmailOrPhone.trim(),
          code: resetCode.trim(),
          newPassword
        })
      });
      const data = await safeJson(res);
      if (res.ok) {
        setForgotPasswordStep("success");
        setForgotPasswordMsg(data.message || "Palavra-passe alterada com sucesso!");
        setEmail(resetEmailOrPhone.trim());
        setPassword(newPassword);
      } else {
        setForgotPasswordErr(data.error || "Erro ao redefinir a palavra-passe.");
      }
    } catch (err) {
      console.error(err);
      setForgotPasswordErr("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.toLowerCase().includes("admin")) {
      setShowAdminModal(true);
    }
  }, []);

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) {
      setAdminError("Por favor preencha o e-mail e a palavra-passe de administrador.");
      return;
    }
    setLoading(true);
    setAdminError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword })
      });

      if (response.ok) {
        const data = await safeJson(response);
        setShowAdminModal(false);
        onLoginSuccess(data.user);
      } else {
        const err = await safeJson(response);
        setAdminError(err.error || "Credenciais de administrador incorretas.");
      }
    } catch (err) {
      console.error(err);
      setAdminError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password.trim() || undefined,
          role 
        })
      });
      if (response.ok) {
        const data = await safeJson(response);
        onLoginSuccess(data.user);
      } else {
        const errData = await safeJson(response);
        setErrorMsg(errData.error || "Erro ao efetuar o acesso ao consultório.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Ocorreu um erro de conexão com o servidor de telemedicina.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrmedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingOrmedFile(true);
    setOrmedDocName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setOrmedDocBase64(result || "");
      setIsReadingOrmedFile(false);
    };
    reader.onerror = () => {
      alert("Erro ao ler ficheiro da ORMED.");
      setIsReadingOrmedFile(false);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      alert("Por favor preencha seu nome!");
      return;
    }
    if (!regEmail.trim() && !regPhone.trim()) {
      alert("Por favor preencha pelo menos um e-mail ou número de telefone!");
      return;
    }
    if (regEmail.trim() && !regPassword) {
      alert("Por favor crie uma palavra-passe para o seu acesso!");
      return;
    }

    if (regRole === UserRole.DOCTOR) {
      if (!crmNumber.trim()) {
        alert("Por favor insira o seu número de Inscrição na ORMED Angola!");
        return;
      }
      if (!ormedDocBase64) {
        alert("Atenção: É obrigatório carregar o seu documento comprovativo da ORMED Angola (PDF ou Imagem)!");
        return;
      }
    }

    setLoading(true);

    try {
      // Register directly with Supabase Auth on the client side
      if (regEmail.trim() && regPassword.trim()) {
        try {
          await supabase.auth.signUp({
            email: regEmail.trim().toLowerCase(),
            password: regPassword.trim(),
            options: {
              data: {
                name: regName.trim(),
                full_name: regName.trim(),
                role: regRole,
                phoneNumber: regPhone.trim(),
                dateOfBirth: regDob,
                gender: regGender,
                province: regProvince,
                bloodType: regBloodType,
                licenseNumber: crmNumber.trim(),
                specialtyId: selectedSpecialtyId,
                hospitalAffiliation: regHospital.trim()
              }
            }
          });
        } catch (sbErr) {
          console.warn("Aviso Supabase Client signUp:", sbErr);
        }
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim().toLowerCase(),
          password: regPassword.trim() || undefined,
          phoneNumber: regPhone.trim(),
          name: regName.trim(),
          role: regRole,
          // Patient details
          dateOfBirth: regDob,
          gender: regGender,
          province: regProvince,
          bloodType: regBloodType,
          allergies: regAllergies ? [regAllergies] : [],
          // Doctor details
          specialtyId: selectedSpecialtyId,
          specialtyName: specialties.find(s => s.id === selectedSpecialtyId)?.name || "Clínica Geral",
          licenseNumber: crmNumber.trim(),
          yearsOfExperience: Number(regYearsExp) || 1,
          hospitalAffiliation: regHospital.trim(),
          bio: regBio.trim(),
          consultationFee: Number(consultationFee) || 20000,
          ormedDocumentUrl: ormedDocBase64,
          ormedDocumentName: ormedDocName,
          authProvider: regPhone.trim() && !regEmail.trim() ? "phone" : "email"
        })
      });

      if (response.ok) {
        const data = await safeJson(response);
        if (regRole === UserRole.DOCTOR) {
          alert("Inscrição de Médico efetuada com sucesso!\n\nO seu documento da ORMED Angola foi submetido à Administração. Por favor, aguarde a aprovação do Administrador para começar a atender consultas.");
        } else {
          alert("Inscrição efetuada com sucesso! Você já pode realizar o login.");
        }
        setEmail(regEmail || regPhone);
        setPassword(regPassword);
        setRole(regRole);
        setIsRegistering(false);
      } else {
        const err = await safeJson(response);
        alert(err.error || "Erro ao registrar usuário.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao se conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Shortcut login help for anonymous patient
  const handleAnonymousDemo = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/demo-anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        const data = await safeJson(response);
        onLoginSuccess(data.user);
      } else {
        setErrorMsg("Erro ao iniciar sessão como paciente anónimo.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoRole: UserRole) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, role: demoRole })
      });
      if (response.ok) {
        const data = await safeJson(response);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Simulated Gmail/Google Authentication
  const handleGoogleAuthSelect = async (selectedEmail: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedEmail, role: UserRole.PATIENT })
      });

      if (response.ok) {
        const data = await safeJson(response);
        onLoginSuccess(data.user);
        setShowGoogleModal(false);
      } else {
        const err = await safeJson(response);
        setErrorMsg(err.error || "Esta conta do Gmail ainda não foi cadastrada pelo Administrador da Plataforma.");
        setShowGoogleModal(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao autenticar com o Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoogleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleName.trim()) {
      alert("Por favor insira seu nome!");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customGoogleEmail.trim().toLowerCase(),
          name: customGoogleName.trim(),
          role: customGoogleRole,
          authProvider: "google",
          avatarUrl: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? "1534528741775-53994a69daeb" : "1507003211169-0a1dd7228f2d"}?auto=format&fit=crop&q=80&w=150`
        })
      });

      if (response.ok) {
        const data = await safeJson(response);
        onLoginSuccess(data.user);
        setShowGoogleModal(false);
      } else {
        const err = await safeJson(response);
        alert(err.error || "Falha ao registrar com o Google.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Check if string entered looks like a phone number
  const isPhoneNumberInput = /^\+?[0-9\s\-()]{6,20}$/.test(email) || (!email.includes("@") && email.trim() !== "" && /^[0-9]+$/.test(email.replace(/\D/g, "")));

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6 lg:px-8 overflow-hidden bg-teal-950">
      
      {/* Full Widescreen Outer Background Image (Covers outside limits of the login card) */}
      <div className="absolute inset-0 z-0">
        <img
          src={telemedFullBg}
          alt="Telemedicina Mwenho TelemedAI Background"
          className="h-full w-full object-cover object-center filter brightness-45 contrast-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-teal-950/80 to-slate-900/85 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-white/95 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Column: Key Visual Banner (~40% width on Desktop) */}
        <div className="relative hidden lg:flex lg:col-span-5 bg-slate-900 p-8 flex-col justify-between text-white overflow-hidden">
          {/* Key Visual Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src={mwenhoProKv}
              alt="Mwenho TelemedAI Angola - Telemedicina de Excelência"
              className="h-full w-full object-cover object-top filter brightness-95 contrast-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-teal-950/65 to-slate-950/40" />
          </div>
          
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-teal-200 border border-teal-400/30">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Rede Médica de Angola 🇦🇴</span>
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
              A Nova Era da Saúde Digital em Angola.
            </h1>
            
            {/* Scannable Bullet Highlights */}
            <div className="space-y-2 pt-1 text-xs text-teal-100/90 leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Consultas Virtuais HD:</strong> Atendimento sem filas de espera</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Triagem IA:</strong> Avaliação clínica preliminar</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Receitas ORMED:</strong> Válidas em farmácias em Angola</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Pagamentos Kz:</strong> Multicaixa Express integrado</span>
              </div>
            </div>
          </div>

          {/* Feature Highlights Box - Placed at bottom so doctor's face remains cleanly visible */}
          <div className="relative z-10 mt-auto pt-6">
            <div className="bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                <ShieldCheck className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Garantia de Qualidade Clínica</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Corpo médico verificado pela ORMED com sigilo clínico total e encriptação de dados de ponta a ponta.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 mt-4 pt-3 text-[11px] text-teal-200/80">
              <span>© 2026 Mwenho TelemedAI Angola</span>
              <span className="font-semibold text-teal-300">Saúde sem fronteiras</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form Area (~60% width on Desktop for plenty of breathing space) */}
        <div className="lg:col-span-7 p-8 sm:p-10 space-y-6 flex flex-col justify-between bg-white">
          
          {/* Key Visual Banner image thumbnail for Mobile Screens */}
          <div className="lg:hidden relative overflow-hidden rounded-2xl border border-teal-100 bg-slate-900 text-white p-5 shadow-sm space-y-2">
            <img
              src={mwenhoProKv}
              alt="Mwenho TelemedAI Key Visual"
              className="absolute inset-0 h-full w-full object-cover opacity-40 filter brightness-90"
              referrerPolicy="no-referrer"
            />
            <div className="relative z-10">
              <span className="inline-block rounded-full bg-teal-500/30 px-2.5 py-0.5 text-[10px] font-bold text-teal-200 border border-teal-300/30">
                Telemedicina Angola 🇦🇴
              </span>
              <h2 className="text-base font-extrabold text-white mt-1">Mwenho TelemedAI</h2>
              <p className="text-[11px] text-teal-100/90">A sua consulta médica online rápida e segura.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Top Header & Trust Badges */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 flex items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-100">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-sans text-xl font-extrabold tracking-tight text-slate-900">
                      {isRegistering ? "Criar Nova Conta Clínica" : "Acesse o Consultório Digital"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isRegistering ? "Cadastre-se para teleconsultas online e triagem IA em Angola" : "Plataforma de saúde digital com prontuário eletrónico e telemedicina"}
                    </p>
                  </div>
                </div>
              </div>

              {/* High Visibility Compliance & Trust Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-teal-800">
                  <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>ORMED Angola</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-600">
                  <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Ambiente Seguro | APD (Lei n.º 22/11)</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-slate-800">
                  <CreditCard className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span>Multicaixa Express (Kz)</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* GOOGLE SIGN IN & LOGIN FORM */}
            {!isRegistering ? (
              <div className="space-y-4">
                {/* GOOGLE LOGIN BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setGoogleStep("choose");
                    setShowGoogleModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
                >
                  <GoogleIcon />
                  <span>Entrar com Gmail / Google</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 shrink-0">Ou entre com e-mail / telefone</span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                <form className="space-y-4" onSubmit={handleLogin}>
                  {/* Select Role (Perfil de Entrada) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Perfil de Entrada</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.PATIENT)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center transition-all ${
                          role === UserRole.PATIENT 
                            ? "border-teal-600 bg-teal-50/90 text-teal-900 font-extrabold shadow-xs ring-1 ring-teal-600" 
                            : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100 font-semibold"
                        }`}
                      >
                        <Users className={`h-4 w-4 ${role === UserRole.PATIENT ? 'text-teal-700' : 'text-slate-400'}`} />
                        <span className="text-xs">Paciente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole(UserRole.DOCTOR)}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-center transition-all ${
                          role === UserRole.DOCTOR 
                            ? "border-teal-600 bg-teal-50/90 text-teal-900 font-extrabold shadow-xs ring-1 ring-teal-600" 
                            : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100 font-semibold"
                        }`}
                      >
                        <Activity className={`h-4 w-4 ${role === UserRole.DOCTOR ? 'text-teal-700' : 'text-slate-400'}`} />
                        <span className="text-xs">Médico</span>
                      </button>
                    </div>
                  </div>

                  {/* Input Email or Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Endereço de E-mail ou Telefone</label>
                    <div className="relative">
                      <input
                        id="login-email"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ex: seu-email@exemplo.com ou +244 923 000 111"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                      {isPhoneNumberInput ? (
                        <Phone className="absolute left-3.5 top-3 h-4 w-4 text-teal-600 animate-pulse" />
                      ) : (
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Input Palavra-passe */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Palavra-passe (Senha)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmailOrPhone(email);
                          setShowForgotPasswordModal(true);
                        }}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                      >
                        Esqueceu a palavra-passe?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite sua palavra-passe"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      />
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Solid Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-md shadow-teal-200/50 hover:bg-teal-700 transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Acedendo..." : "Entrar no Consultório"}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors bg-teal-50 px-4 py-2 rounded-xl border border-teal-200/70"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Não tem conta? Cadastrar-se na Plataforma</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="bg-teal-50/70 border border-teal-200/80 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-teal-900">Preencha os dados para Cadastrar</h3>
                    <p className="text-[10px] text-teal-700">Selecione o seu perfil e insira as informações do cadastro</p>
                  </div>
                </div>

                {/* Reg profile role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipo de Perfil para Cadastro</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.PATIENT)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${
                        regRole === UserRole.PATIENT 
                          ? 'border-teal-600 bg-teal-50 text-teal-800 font-extrabold ring-1 ring-teal-600' 
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Paciente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.DOCTOR)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${
                        regRole === UserRole.DOCTOR 
                          ? 'border-teal-600 bg-teal-50 text-teal-800 font-extrabold ring-1 ring-teal-600' 
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Médico</span>
                    </button>
                  </div>
                </div>

                {/* COMMON FIELDS */}
                <div className="space-y-3 pt-1">
                  {/* Reg name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {regRole === UserRole.DOCTOR ? "Nome Completo com Título *" : "Nome Completo *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={regRole === UserRole.DOCTOR ? "Ex: Dr. Manuel João Neto" : "Ex: Manuel João Neto"}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Reg email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {regRole === UserRole.DOCTOR ? "E-mail Profissional *" : "Endereço de E-mail / Gmail *"}
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Reg Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Telefone / WhatsApp (+244) *</label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+244 923 000 111"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Reg Password */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Criar Palavra-passe (Senha) *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Crie uma palavra-passe segura"
                        className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2 text-xs focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PATIENT SPECIFIC FIELDS */}
                {regRole === UserRole.PATIENT && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 bg-slate-50/50 p-3 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                      Dados do Paciente para Prontuário Clínico
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Data de Nascimento</label>
                        <input
                          type="date"
                          value={regDob}
                          onChange={(e) => setRegDob(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Gênero / Sexo</label>
                        <select
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        >
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Província de Residência</label>
                        <select
                          value={regProvince}
                          onChange={(e) => setRegProvince(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        >
                          <option value="Luanda">Luanda</option>
                          <option value="Benguela">Benguela</option>
                          <option value="Huambo">Huambo</option>
                          <option value="Huíla">Huíla</option>
                          <option value="Cabinda">Cabinda</option>
                          <option value="Namibe">Namibe</option>
                          <option value="Malanje">Malanje</option>
                          <option value="Cuanza Sul">Cuanza Sul</option>
                          <option value="Uíge">Uíge</option>
                          <option value="Outra">Outra Província</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Grupo Sanguíneo</label>
                        <select
                          value={regBloodType}
                          onChange={(e) => setRegBloodType(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        >
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 block">Alergias ou Condições de Saúde Prévias (Opcional)</label>
                      <input
                        type="text"
                        value={regAllergies}
                        onChange={(e) => setRegAllergies(e.target.value)}
                        placeholder="Ex: Alergia a Penicilina, Hipertensão..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* DOCTOR SPECIFIC FIELDS */}
                {regRole === UserRole.DOCTOR && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 bg-teal-50/40 p-3 rounded-2xl border border-teal-200/80">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <span>Validação de Cédula Profissional - ORMED Angola</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-normal">
                        Médicos devem indicar a cédula e carregar comprovativo oficial. O perfil passará por verificação administrativa antes da ativação de consultas.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Especialidade Médica *</label>
                        <select
                          value={selectedSpecialtyId}
                          onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white font-medium"
                        >
                          {specialties.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">N.º Cédula ORMED Angola *</label>
                        <input
                          type="text"
                          required
                          value={crmNumber}
                          onChange={(e) => setCrmNumber(e.target.value)}
                          placeholder="Ex: ORMED-AO 4821"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Hospital / Clínica habitual</label>
                        <input
                          type="text"
                          value={regHospital}
                          onChange={(e) => setRegHospital(e.target.value)}
                          placeholder="Ex: Hospital Josina Machel"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Valor por Consulta (Kz) *</label>
                        <input
                          type="number"
                          required
                          min={1000}
                          step={1000}
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(Number(e.target.value))}
                          placeholder="20000"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-bold text-teal-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Anos de Experiência Clínica</label>
                      <input
                        type="number"
                        min={1}
                        value={regYearsExp}
                        onChange={(e) => setRegYearsExp(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Documento da ORMED Angola (PDF ou Imagem) *</label>
                      <div className="relative">
                        <input
                          type="file"
                          required
                          accept=".pdf,image/*"
                          onChange={handleOrmedFileChange}
                          className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-100 file:text-teal-800 hover:file:bg-teal-200 cursor-pointer"
                        />
                      </div>
                      {isReadingOrmedFile && (
                        <span className="text-[10px] text-teal-600 font-bold block">A ler ficheiro...</span>
                      )}
                      {ormedDocName && !isReadingOrmedFile && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Documento anexado: {ormedDocName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {loading ? "Cadastrando no Supabase..." : "Cadastrar"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Já tem conta? Voltar ao Login
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Discrete & Secure Admin Access Footer Link */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span>Acesso Restrito do Administrador Geral</span>
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                  <Shield className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-900">Autenticação de Administrador</h3>
                  <p className="text-[11px] text-slate-500">Acesso ao painel central e gestão da plataforma</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {adminError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">E-mail de Administrador</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@mwenho.ao"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Palavra-passe de Acesso</label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                <p><strong>Área Restrita:</strong> Apenas administradores credenciados do Mwenho TelemedAI podem aceder a esta secção.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? "A verificar credenciais..." : "Entrar como Administrador Geral"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SIMULATED GOOGLE AUTHENTICATION DIALOG POPUP */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Header Google styled */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                <GoogleIcon />
              </div>
              <h3 className="text-md font-bold text-slate-800">Fazer login com o Google</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">para continuar no Mwenho TelemedAI</p>
            </div>

            {googleStep === "choose" ? (
              <div className="mt-5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">Informe sua conta do Google</span>
                
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="exemplo@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      if (!customGoogleEmail.trim() || !customGoogleEmail.includes("@")) {
                        alert("Por favor insira um e-mail do Gmail válido!");
                        return;
                      }
                      handleGoogleAuthSelect(customGoogleEmail.trim().toLowerCase());
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Entrar com este Gmail
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  Autenticação segura via serviços do Google. Apenas contas previamente cadastradas têm acesso autorizado.
                </p>

                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 mt-1 block"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateGoogleAccount} className="mt-5 space-y-4">
                <div className="bg-teal-50/40 border border-teal-100 rounded-xl p-3 text-xs text-teal-800 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Nova conta identificada!</span>
                    <span className="block mt-0.5 text-[11px] text-teal-700/90">Preencha os detalhes para criar seu perfil instantâneo através do Gmail.</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">E-mail Gmail Confirmado</label>
                  <input
                    type="text"
                    disabled
                    value={customGoogleEmail}
                    className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Seu Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Desejo me cadastrar como:</label>
                  <div className="flex gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="google-role"
                        checked={customGoogleRole === UserRole.PATIENT}
                        onChange={() => setCustomGoogleRole(UserRole.PATIENT)}
                        className="accent-teal-600"
                      />
                      Paciente
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="google-role"
                        checked={customGoogleRole === UserRole.DOCTOR}
                        onChange={() => setCustomGoogleRole(UserRole.DOCTOR)}
                        className="accent-teal-600"
                      />
                      Médico
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGoogleStep("choose")}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-700 shadow-md shadow-teal-50"
                  >
                    Confirmar Conta
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* FORGOT PASSWORD / RECOVER PASSWORD MODAL */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowForgotPasswordModal(false);
                setForgotPasswordStep("request");
                setForgotPasswordErr("");
                setForgotPasswordMsg("");
              }}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Recuperar Palavra-passe</h3>
                <p className="text-xs text-slate-500">Mwenho TelemedAI Security</p>
              </div>
            </div>

            {forgotPasswordErr && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{forgotPasswordErr}</span>
              </div>
            )}

            {forgotPasswordStep === "request" && (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Informe o seu endereço de e-mail ou número de telefone cadastrado para enviarmos um código de verificação de segurança.
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">E-mail ou Telefone</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={resetEmailOrPhone}
                      onChange={(e) => setResetEmailOrPhone(e.target.value)}
                      placeholder="exemplo@email.com ou +244 923 000 111"
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-[11px] text-teal-800 flex gap-2 items-start">
                  <Sparkles className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>O código de verificação será gerado e enviado para a sua conta para redefinir a palavra-passe em segurança.</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "A enviar..." : "Enviar Código"}
                  </button>
                </div>
              </form>
            )}

            {forgotPasswordStep === "verify" && (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                {forgotPasswordMsg && (
                  <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-800 flex gap-2 items-start">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{forgotPasswordMsg}</span>
                      {generatedCodeDisplay && (
                        <span className="block mt-1 font-mono text-xs bg-white px-2 py-1 rounded border border-teal-200 text-teal-900 font-bold">
                          Código gerado: {generatedCodeDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Código de Verificação (6 Dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Ex: 849201"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-center focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nova Palavra-passe</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Crie uma nova palavra-passe"
                      className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Confirmar Nova Palavra-passe</label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep("request")}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? "A atualizar..." : "Redefinir Palavra-passe"}
                  </button>
                </div>
              </form>
            )}

            {forgotPasswordStep === "success" && (
              <div className="text-center space-y-4 py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Palavra-passe Redefinida!</h4>
                  <p className="text-xs text-slate-500">
                    A sua palavra-passe foi alterada com sucesso. Agora já pode aceder ao consultório com as novas credenciais.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordStep("request");
                    setForgotPasswordErr("");
                    setForgotPasswordMsg("");
                  }}
                  className="w-full py-3 rounded-xl bg-teal-600 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-colors"
                >
                  Ir para o Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
