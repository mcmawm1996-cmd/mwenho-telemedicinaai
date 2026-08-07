import React, { useState, useEffect, useMemo } from "react";
import { User, SystemStats, LoginLog, PlatformManager } from "../types.js";
import { safeJson } from "../utils.js";
import { 
  Users, Stethoscope, Calendar, DollarSign, CheckCircle, 
  XCircle, TrendingUp, AlertTriangle, Activity,
  UserPlus, Shield, X, Trash2, Search, Camera, CheckSquare, Square, LogIn, RotateCcw, Check
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function AdminDashboard({ currentUser, onRefreshData }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "finances" | "doctors" | "patients" | "managers" | "audit" | "supabase">("analytics");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userList, setUserList] = useState<User[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [supabaseInfo, setSupabaseInfo] = useState<any>(null);
  const [sqlSchema, setSqlSchema] = useState<string>("");
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Financials State
  const [financials, setFinancials] = useState<any>(null);

  // Managers State
  const [managersList, setManagersList] = useState<PlatformManager[]>([]);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [mngName, setMngName] = useState("");
  const [mngEmail, setMngEmail] = useState("");
  const [mngPhone, setMngPhone] = useState("");
  const [mngPassword, setMngPassword] = useState("123456");
  const [mngRoleTitle, setMngRoleTitle] = useState<"Gestor Financeiro" | "Gestor de Médicos" | "Gestor de Atendimento / Suporte" | "Administrador Geral">("Gestor Financeiro");
  const [mngDept, setMngDept] = useState("Departamento Financeiro");
  const [mngAvatarUrl, setMngAvatarUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150");
  const [isSubmittingMng, setIsSubmittingMng] = useState(false);

  // Multi-select state for Doctors & Patients
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  // Modal State for Registering Doctor
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docPassword, setDocPassword] = useState("123456");
  const [docSpecialtyId, setDocSpecialtyId] = useState("sp-1");
  const [docOrmed, setDocOrmed] = useState("");
  const [docFee, setDocFee] = useState(20000);
  const [docBio, setDocBio] = useState("");
  const [docAvatarUrl, setDocAvatarUrl] = useState("https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150");
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // Modal State for Registering Patient
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [patName, setPatName] = useState("");
  const [patEmail, setPatEmail] = useState("");
  const [patPhone, setPatPhone] = useState("");
  const [patPassword, setPatPassword] = useState("123456");
  const [patDob, setPatDob] = useState("1995-01-01");
  const [patGender, setPatGender] = useState("Masculino");
  const [patAvatarUrl, setPatAvatarUrl] = useState("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150");
  const [isSubmittingPat, setIsSubmittingPat] = useState(false);

  // Modal State for Editing Doctor Consultation Fee
  const [editingFeeDoctor, setEditingFeeDoctor] = useState<{ id: string; name: string; currentFee: number } | null>(null);
  const [newConsultationFee, setNewConsultationFee] = useState<number>(20000);
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  // Login Audit State
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [auditSubTab, setAuditSubTab] = useState<"active_profiles" | "recent_access">("active_profiles");

  const fetchSpecialties = async () => {
    try {
      const res = await fetch("/api/specialties");
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) setSpecialties(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await safeJson(res);
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          const map = new Map<string, User>();
          data.forEach(u => {
            if (u && u.id) map.set(u.id, u);
          });
          setUserList(Array.from(map.values()));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFinancials = async () => {
    try {
      const res = await fetch("/api/admin/financials");
      if (res.ok) {
        const data = await safeJson(res);
        setFinancials(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/admin/managers");
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) {
          const map = new Map<string, PlatformManager>();
          data.forEach(m => {
            if (m && m.id) map.set(m.id, m);
          });
          setManagersList(Array.from(map.values()));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLoginLogs = async (query = "") => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/login-logs?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) setLoginLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetch("/api/supabase/status");
      if (res.ok) {
        const data = await safeJson(res);
        setSupabaseInfo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSqlSchema = async () => {
    try {
      const res = await fetch("/api/supabase/schema");
      if (res.ok) {
        const data = await safeJson(res);
        if (data.sql) setSqlSchema(data.sql);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(), 
      fetchUsers(), 
      fetchSpecialties(), 
      fetchFinancials(), 
      fetchManagers(),
      fetchLoginLogs(),
      fetchSupabaseStatus(),
      fetchSqlSchema()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mngName.trim()) {
      alert("Por favor informe o nome do gestor!");
      return;
    }
    if (!mngAvatarUrl.trim()) {
      alert("A foto de perfil do gestor é obrigatória!");
      return;
    }
    setIsSubmittingMng(true);

    try {
      const res = await fetch("/api/admin/managers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mngName.trim(),
          email: mngEmail.trim(),
          phone: mngPhone.trim(),
          password: mngPassword.trim() || "123456",
          roleTitle: mngRoleTitle,
          department: mngDept.trim(),
          avatarUrl: mngAvatarUrl.trim()
        })
      });

      if (res.ok) {
        alert("Novo gestor cadastrado com sucesso!");
        setShowAddManagerModal(false);
        setMngName("");
        setMngEmail("");
        setMngPhone("");
        fetchManagers();
        fetchUsers();
      } else {
        const err = await safeJson(res);
        alert(err.error || "Erro ao cadastrar gestor.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao cadastrar gestor.");
    } finally {
      setIsSubmittingMng(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim() || !docOrmed.trim()) {
      alert("Por favor insira o nome e o número de licença ORMED do médico!");
      return;
    }
    if (!docAvatarUrl.trim()) {
      alert("A foto de perfil do médico é obrigatória!");
      return;
    }
    setIsSubmittingDoc(true);

    try {
      const res = await fetch("/api/admin/doctors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docName.trim(),
          email: docEmail.trim(),
          phoneNumber: docPhone.trim(),
          password: docPassword.trim() || "123456",
          specialtyId: docSpecialtyId,
          licenseNumber: docOrmed.trim(),
          consultationFee: docFee,
          bio: docBio.trim(),
          avatarUrl: docAvatarUrl.trim()
        })
      });

      if (res.ok) {
        alert("Médico cadastrado com foto e credenciado com sucesso no sistema!");
        setShowAddDoctorModal(false);
        setDocName("");
        setDocEmail("");
        setDocPhone("");
        setDocOrmed("");
        setDocBio("");
        loadAllAdminData();
        onRefreshData();
      } else {
        const err = await safeJson(res);
        alert(err.error || "Erro ao cadastrar médico.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão ao cadastrar médico.");
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patName.trim()) {
      alert("Por favor informe o nome do paciente!");
      return;
    }
    if (!patAvatarUrl.trim()) {
      alert("A foto de perfil do paciente é obrigatória!");
      return;
    }
    setIsSubmittingPat(true);

    try {
      const res = await fetch("/api/admin/patients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: patName.trim(),
          email: patEmail.trim(),
          phoneNumber: patPhone.trim(),
          password: patPassword.trim() || "123456",
          dateOfBirth: patDob,
          gender: patGender,
          avatarUrl: patAvatarUrl.trim()
        })
      });

      if (res.ok) {
        alert("Paciente cadastrado com foto com sucesso no sistema!");
        setShowAddPatientModal(false);
        setPatName("");
        setPatEmail("");
        setPatPhone("");
        setPatPassword("");
        loadAllAdminData();
        onRefreshData();
      } else {
        const err = await safeJson(res);
        alert(err.error || "Erro ao cadastrar paciente.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha ao cadastrar paciente.");
    } finally {
      setIsSubmittingPat(false);
    }
  };

  const handleRemoveSingleUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name} do sistema? Esta ação irá excluir o perfil do utilizador permanentemente.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert(`${name} foi removido com sucesso do sistema.`);
        setUserList(prev => prev.filter(u => u.id !== id));
        setSelectedDoctorIds(prev => prev.filter(i => i !== id));
        setSelectedPatientIds(prev => prev.filter(i => i !== id));
        await loadAllAdminData();
        if (onRefreshData) onRefreshData();
      } else {
        const err = await safeJson(res);
        alert(err.error || "Erro ao remover utilizador.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao remover utilizador.");
    }
  };

  const handleRemoveBulkUsers = async (ids: string[], userType: "médicos" | "pacientes") => {
    if (ids.length === 0) return;
    if (!confirm(`Tem certeza que deseja remover os ${ids.length} ${userType} selecionados?`)) return;
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        alert(`${ids.length} ${userType} removidos com sucesso!`);
        setUserList(prev => prev.filter(u => !ids.includes(u.id)));
        if (userType === "médicos") setSelectedDoctorIds([]);
        if (userType === "pacientes") setSelectedPatientIds([]);
        await loadAllAdminData();
        if (onRefreshData) onRefreshData();
      } else {
        alert("Erro ao remover utilizadores.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar ao servidor.");
    }
  };

  const handleResetFinancialsAndAnalytics = async () => {
    if (!confirm("Tem certeza que deseja ZERAR TODOS os dados financeiros e métricas de analytics?\n\nEsta ação irá redefinir o histórico de agendamentos, faturamento e relatórios de analytics.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/reset-financials", { method: "POST" });
      if (res.ok) {
        alert("Dados financeiros e de analytics foram zerados com sucesso!");
        await loadAllAdminData();
        if (onRefreshData) onRefreshData();
      } else {
        alert("Erro ao zerar dados financeiros.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar ao servidor.");
    }
  };

  const handleRemoveBulkManagers = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`Tem certeza que deseja remover os ${ids.length} gestores selecionados?`)) return;
    try {
      const res = await fetch("/api/admin/managers/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        alert(`${ids.length} gestores removidos com sucesso!`);
        setSelectedManagerIds([]);
        fetchManagers();
        fetchUsers();
      } else {
        alert("Erro ao remover gestores.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveDoctor = async (doctorId: string, doctorName?: string) => {
    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}/approve`, {
        method: "PUT"
      });
      if (response.ok) {
        if (doctorName) {
          alert(`O médico ${doctorName} foi aprovado com sucesso!`);
        }
        loadAllAdminData();
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateDoctorFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeeDoctor) return;
    setIsUpdatingFee(true);

    try {
      const response = await fetch(`/api/admin/doctors/${editingFeeDoctor.id}/fee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationFee: newConsultationFee })
      });

      if (response.ok) {
        alert(`Preço de consulta do ${editingFeeDoctor.name} atualizado para ${newConsultationFee.toLocaleString("pt-AO")} Kz!`);
        setEditingFeeDoctor(null);
        loadAllAdminData();
        onRefreshData();
      } else {
        const err = await safeJson(response);
        alert(err.error || "Erro ao atualizar o preço da consulta.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão ao atualizar preço da consulta.");
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const doctorsList = useMemo(() => {
    const map = new Map<string, User>();
    userList.filter(u => u.role === "DOCTOR").forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  }, [userList]);

  const patientsList = useMemo(() => {
    const map = new Map<string, User>();
    userList.filter(u => u.role === "PATIENT").forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  }, [userList]);

  // Recharts color palettes
  const COLORS = ["#0d9488", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Admin header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">
            Painel Administrativo Geral
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestão central de Pacientes, Médicos, Gestores e Auditoria de Logins em tempo real na Firebase.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("finances")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "finances"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💰 Finanças
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "doctors"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🩺 Médicos ({doctorsList.length})
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "patients"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👥 Pacientes ({patientsList.length})
          </button>
          <button
            onClick={() => setActiveTab("managers")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "managers"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🛡️ Gestores ({managersList.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "audit"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔍 Logins de Acesso
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400">
          Carregando informações do sistema...
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          
          {/* TAB 1: Analytics Dashboards */}
          {activeTab === "analytics" && stats && (
            <div className="space-y-6">
              {/* Header Banner with Reset Button */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">Métricas & Analytics Globais</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Acompanhamento do desempenho hospitalar, consultas e diagnósticos por IA.</p>
                </div>
                <button
                  onClick={handleResetFinancialsAndAnalytics}
                  className="flex items-center gap-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <span>Zerar Dados Financeiros & Analytics</span>
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faturamento Hospitalar</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">{stats.totalRevenue.toLocaleString("pt-AO")} Kz</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Médicos Cadastrados</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">{stats.totalDoctors} Médicos</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pacientes Ativos</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">{stats.totalPatients} Pacientes</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Consultas</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">{stats.totalAppointments} Agendadas</span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Data Charts Grid using Recharts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    Fluxo Mensal de Receita
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.revenueByMonth}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="amount" stroke="#0d9488" fillOpacity={0.1} fill="#0d9488" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Gravidade de Sintomas (Triagem AI)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.severityStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="severity" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#eab308" radius={[4, 4, 0, 0]}>
                          {stats.severityStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.severity === 'Urgente' ? '#ef4444' : entry.severity === 'Alto' ? '#f59e0b' : entry.severity === 'Moderado' ? '#0ea5e9' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIALS DASHBOARD */}
          {activeTab === "finances" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">
                      Gestão Financeira Global & Distribuição de Ganhos
                    </h3>
                    <p className="text-xs text-slate-500">
                      Análise de faturamento da plataforma Mwenho TelemedAI e receitas por consulta.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetFinancialsAndAnalytics}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                      <span>Zerar Finanças & Analytics</span>
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <span>Moeda: Kwanzas (AOA / Kz)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Faturamento Bruto Total</span>
                    <span className="text-xl font-black text-slate-900 block">
                      {(financials?.totalGrossRevenue || 0).toLocaleString("pt-AO")} Kz
                    </span>
                    <span className="text-[10px] text-slate-500 block">Consultas + Subscrições ativas</span>
                  </div>

                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">Lucro Mwenho (Empresa)</span>
                    <span className="text-xl font-black text-teal-900 block">
                      {(financials?.totalMwenhoCompanyRevenue || 0).toLocaleString("pt-AO")} Kz
                    </span>
                    <span className="text-[10px] text-teal-700 block">15% comissão + subscrições</span>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Repasse Total a Médicos</span>
                    <span className="text-xl font-black text-blue-900 block">
                      {(financials?.doctorConsultationPayout || 0).toLocaleString("pt-AO")} Kz
                    </span>
                    <span className="text-[10px] text-blue-700 block">85% das teleconsultas pagas</span>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Subscrições Mensais</span>
                    <span className="text-xl font-black text-purple-900 block">
                      {(financials?.totalSubscriptionRevenue || 0).toLocaleString("pt-AO")} Kz
                    </span>
                    <span className="text-[10px] text-purple-700 block">{financials?.activeSubscribersCount || 0} Pacientes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCTORS MANAGEMENT */}
          {activeTab === "doctors" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">
                    Corpo Médico Cadastrado ({doctorsList.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cadastre novos médicos com foto obrigatória ou remova médicos selecionados.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedDoctorIds.length > 0 && (
                    <button
                      onClick={() => handleRemoveBulkUsers(selectedDoctorIds, "médicos")}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover Selecionados ({selectedDoctorIds.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddDoctorModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-colors"
                  >
                    <Stethoscope className="h-4 w-4" />
                    <span>Cadastrar Novo Médico</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                {doctorsList.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Stethoscope className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="text-xs font-medium text-slate-500">Nenhum médico cadastrado na plataforma até ao momento.</p>
                    <button
                      onClick={() => setShowAddDoctorModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
                    >
                      Cadastrar Primeiro Médico
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedDoctorIds.length === doctorsList.length && doctorsList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedDoctorIds(doctorsList.map(d => d.id));
                              else setSelectedDoctorIds([]);
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="px-4 py-3">Foto & Nome</th>
                        <th className="px-4 py-3">Inscrição ORMED</th>
                        <th className="px-4 py-3">Documento ORMED</th>
                        <th className="px-4 py-3">Especialidade</th>
                        <th className="px-4 py-3">Preço Consulta</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctorsList.map((user, idx) => {
                        const isSelected = selectedDoctorIds.includes(user.id);
                        const isApproved = user.docProfile?.approved !== false;
                        const ormedDocUrl = user.docProfile?.ormedDocumentUrl;
                        return (
                          <tr key={`doc-${user.id}-${idx}`} className={`hover:bg-slate-50/50 ${isSelected ? "bg-teal-50/30" : !isApproved ? "bg-amber-50/30" : ""}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDoctorIds([...selectedDoctorIds, user.id]);
                                  else setSelectedDoctorIds(selectedDoctorIds.filter(id => id !== user.id));
                                }}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-4 py-4 flex items-center gap-3">
                              <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                              <div>
                                <span className="font-bold text-slate-800 block">{user.name}</span>
                                <span className="text-[10px] text-slate-400">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono font-bold text-slate-700">{user.docProfile?.licenseNumber || "ORMED-AO"}</td>
                            <td className="px-4 py-4">
                              {ormedDocUrl ? (
                                <a
                                  href={ormedDocUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 text-[11px] font-bold border border-blue-200 transition-colors"
                                >
                                  📄 Ver PDF/Anexo
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Sem anexo PDF</span>
                              )}
                            </td>
                            <td className="px-4 py-4 font-semibold text-slate-700">{user.docProfile?.specialtyName || "Geral"}</td>
                            <td className="px-4 py-4 font-bold text-teal-700">
                              {(user.docProfile?.consultationFee || 20000).toLocaleString("pt-AO")} Kz
                            </td>
                            <td className="px-4 py-4">
                              {isApproved ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 uppercase border border-emerald-200">
                                  Credenciado
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase border border-amber-300 animate-pulse">
                                  ⚠️ Pendente ORMED
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isApproved && (
                                  <button
                                    onClick={() => handleApproveDoctor(user.id, user.name)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold shadow-sm transition-colors"
                                    title="Aprovar Médico no Sistema"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Aprovar</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveSingleUser(user.id, user.name)}
                                  className="rounded-lg bg-red-50 hover:bg-red-100 p-2 text-red-600 transition-colors"
                                  title="Remover Médico"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PATIENTS MANAGEMENT */}
          {activeTab === "patients" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">
                    Pacientes Cadastrados na Plataforma ({patientsList.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cadastre novos pacientes com foto de perfil obrigatória ou remova contas selecionadas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedPatientIds.length > 0 && (
                    <button
                      onClick={() => handleRemoveBulkUsers(selectedPatientIds, "pacientes")}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover Selecionados ({selectedPatientIds.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddPatientModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Cadastrar Novo Paciente</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                {patientsList.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="text-xs font-medium text-slate-500">Nenhum paciente cadastrado até ao momento.</p>
                    <button
                      onClick={() => setShowAddPatientModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
                    >
                      Cadastrar Primeiro Paciente
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedPatientIds.length === patientsList.length && patientsList.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPatientIds(patientsList.map(p => p.id));
                              else setSelectedPatientIds([]);
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                        </th>
                        <th className="px-4 py-3">Foto & Nome Completo</th>
                        <th className="px-4 py-3">Contacto E-mail / Tel</th>
                        <th className="px-4 py-3">Data de Registo</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientsList.map((user, idx) => {
                        const isSelected = selectedPatientIds.includes(user.id);
                        return (
                          <tr key={`pat-${user.id}-${idx}`} className={`hover:bg-slate-50/50 ${isSelected ? "bg-teal-50/30" : ""}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedPatientIds([...selectedPatientIds, user.id]);
                                  else setSelectedPatientIds(selectedPatientIds.filter(id => id !== user.id));
                                }}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-4 py-4 flex items-center gap-3">
                              <img src={user.avatarUrl} alt={user.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                              <div>
                                <span className="font-bold text-slate-800 block">{user.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">ID: {user.id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="block font-medium text-slate-700">{user.email || "Sem e-mail"}</span>
                              <span className="text-[10px] text-slate-400">{user.phoneNumber || "Sem telefone"}</span>
                            </td>
                            <td className="px-4 py-4 text-slate-500 font-mono text-[10px]">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                onClick={() => handleRemoveSingleUser(user.id, user.name)}
                                className="rounded-lg bg-red-50 hover:bg-red-100 p-2 text-red-600 transition-colors"
                                title="Remover Paciente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MANAGERS & ADMINISTRATORS */}
          {activeTab === "managers" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">
                    Gestores e Administradores da Plataforma ({managersList.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atribua funções específicas a novos gestores (Financeiro, Corpo Clínico, Suporte) com credenciais de acesso individuais.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedManagerIds.length > 0 && (
                    <button
                      onClick={() => handleRemoveBulkManagers(selectedManagerIds)}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover Selecionados ({selectedManagerIds.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddManagerModal(true)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4 text-teal-400" />
                    <span>Adicionar Novo Gestor</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedManagerIds.length === managersList.length && managersList.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedManagerIds(managersList.map(m => m.id));
                            else setSelectedManagerIds([]);
                          }}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="px-4 py-3">Foto & Nome</th>
                      <th className="px-4 py-3">Função / Poder Atribuído</th>
                      <th className="px-4 py-3">Departamento</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {managersList.map((mng, idx) => {
                      const isSelected = selectedManagerIds.includes(mng.id);
                      return (
                        <tr key={`mng-${mng.id}-${idx}`} className={`hover:bg-slate-50/60 ${isSelected ? "bg-teal-50/30" : ""}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedManagerIds([...selectedManagerIds, mng.id]);
                                else setSelectedManagerIds(selectedManagerIds.filter(id => id !== mng.id));
                              }}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                          </td>
                          <td className="px-4 py-4 flex items-center gap-3">
                            <img src={mng.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} alt={mng.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                            <div>
                              <span className="font-bold text-slate-900 block">{mng.name}</span>
                              <span className="text-[11px] text-slate-400">{mng.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-800 border border-teal-100">
                              <Shield className="h-3 w-3 text-teal-600" />
                              {mng.roleTitle}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{mng.department}</td>
                          <td className="px-4 py-4 text-slate-500 font-mono text-[11px]">{mng.phone}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => handleRemoveBulkManagers([mng.id])}
                              className="rounded-lg bg-red-50 hover:bg-red-100 p-2 text-red-600 transition-colors"
                              title="Remover Gestor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: FIREBASE LOGIN AUDIT LOGS & ACTIVE PROFILES */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-slate-800 flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-teal-600" />
                      <span>Auditoria de Logins & Perfis Gravados no Firebase</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Acompanhe os perfis ativos cadastrados no sistema e a auditoria de acessos em tempo real.
                    </p>
                  </div>

                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou e-mail..."
                      value={logSearchQuery}
                      onChange={(e) => {
                        setLogSearchQuery(e.target.value);
                        fetchLoginLogs(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Navigation Sub-Tabs */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setAuditSubTab("active_profiles")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      auditSubTab === "active_profiles"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Perfis Ativos ({userList.length + managersList.length})</span>
                  </button>
                  <button
                    onClick={() => setAuditSubTab("recent_access")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      auditSubTab === "recent_access"
                        ? "bg-teal-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Acessos Recentes ({loginLogs.length})</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: PERFIS ATIVOS NO SISTEMA */}
              {auditSubTab === "active_profiles" && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">Utilizador / Nome</th>
                        <th className="px-5 py-3">E-mail / Contacto</th>
                        <th className="px-5 py-3">Perfil / Função</th>
                        <th className="px-5 py-3">Data de Inscrição</th>
                        <th className="px-5 py-3">Status no Firebase</th>
                        <th className="px-5 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {(() => {
                        const merged = [
                          ...userList,
                          ...managersList.map(m => ({
                            id: m.id,
                            name: m.name,
                            email: m.email,
                            role: "GESTOR" as const,
                            avatarUrl: m.avatarUrl,
                            createdAt: m.createdAt,
                            phoneNumber: m.phone
                          }))
                        ];
                        const uniqueMap = new Map<string, typeof merged[0]>();
                        merged.forEach(item => {
                          if (!uniqueMap.has(item.id)) {
                            uniqueMap.set(item.id, item);
                          }
                        });
                        const filtered = Array.from(uniqueMap.values()).filter(u => {
                          if (!logSearchQuery) return true;
                          const query = logSearchQuery.toLowerCase();
                          return u.name.toLowerCase().includes(query) || (u.email && u.email.toLowerCase().includes(query));
                        });

                        return filtered.map((u, idx) => (
                          <tr key={`profile-${u.id}-${idx}`} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3.5 flex items-center gap-3">
                              <img src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} alt={u.name} className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                              <div>
                                <span className="font-bold text-slate-900 block">{u.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">{u.id}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="block text-slate-800 font-medium">{u.email || "Sem e-mail"}</span>
                              <span className="text-[10px] text-slate-400">{u.phoneNumber || ""}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                                u.role === "ADMIN" ? "bg-slate-900 text-white" : u.role === "DOCTOR" ? "bg-teal-100 text-teal-800" : u.role === "GESTOR" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-PT") : "Cadastrado"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Ativo no Firebase
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {u.role !== "ADMIN" && (
                                <button
                                  onClick={() => handleRemoveSingleUser(u.id, u.name)}
                                  className="rounded-lg bg-red-50 hover:bg-red-100 p-2 text-red-600 transition-colors"
                                  title="Remover Perfil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SUB-TAB 2: ACESSOS RECENTES (LOGS DE LOGIN) */}
              {auditSubTab === "recent_access" && (
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {loadingLogs ? (
                    <div className="p-12 text-center text-xs text-slate-400">Procurando registos no banco de dados Supabase...</div>
                  ) : loginLogs.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                      Nenhum registo de login encontrado com a pesquisa. Os logins efetuados serão automaticamente gravados no Supabase.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3">Data e Hora</th>
                          <th className="px-5 py-3">Utilizador / Nome</th>
                          <th className="px-5 py-3">E-mail de Entrada</th>
                          <th className="px-5 py-3">Perfil / Função</th>
                          <th className="px-5 py-3">Método de Login</th>
                          <th className="px-5 py-3">Dispositivo / User-Agent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {loginLogs.map((log, idx) => (
                          <tr key={`log-${log.id}-${idx}`} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                              {new Date(log.timestamp).toLocaleString("pt-PT")}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-900">{log.userName}</td>
                            <td className="px-5 py-3.5 text-slate-600">{log.userEmail}</td>
                            <td className="px-5 py-3.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                                log.role === "ADMIN" ? "bg-slate-900 text-white" : log.role === "DOCTOR" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                {log.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-teal-700">{log.loginMethod}</td>
                            <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 max-w-xs truncate">{log.ipOrDevice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SUPABASE DATABASE INTEGRATION */}
          {activeTab === "supabase" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Integração com Supabase Database</h3>
                      <p className="text-xs text-slate-600">
                        A plataforma de telemedicina Mwenho está configurada e conectada ao banco de dados Supabase.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchSupabaseStatus}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-md hover:bg-emerald-700 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Testar Conexão Supabase</span>
                  </button>
                </div>

                {/* PRIVACY & SECURITY BANNER */}
                <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-xs text-amber-900">
                    <Shield className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Sigilo Médico & Gestão Direta no Supabase Console (Base de Dados)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Conforme as diretrizes de privacidade e proteção de dados médicos, a consulta e auditoria completa da base de dados é feita diretamente no <strong>Console Oficial do Supabase Cloud</strong> (em <code>https://vupaaywgmcrlghfvwzqq.supabase.co</code>). A plataforma de telemedicina restringe a visualização de dados brutos alheios no frontend para garantir a confidencialidade do paciente.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-sm space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status da Conexão REST</span>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-sm font-extrabold text-emerald-700 uppercase">
                        {supabaseInfo?.status === "online" ? "Ativo & Conectado" : "Conectando ao Supabase..."}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      {supabaseInfo?.message || "Instância Supabase vupaaywgmcrlghfvwzqq conectada."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-sm space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Host do Projeto Supabase</span>
                    <div className="text-xs font-bold text-slate-800 font-mono truncate">
                      https://vupaaywgmcrlghfvwzqq.supabase.co
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold inline-block">
                      Project ID: vupaaywgmcrlghfvwzqq
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parâmetros de Integração Supabase Credenciados:</h4>
                    <button
                      type="button"
                      onClick={() => {
                        fetchSqlSchema();
                        setShowSqlModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-teal-700 transition-colors shadow-xs"
                    >
                      <span>📜 Ver Código SQL Completo (com RLS)</span>
                    </button>
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-sans block font-bold">SUPABASE_URL:</span>
                      <span className="text-slate-800 font-bold select-all">https://vupaaywgmcrlghfvwzqq.supabase.co</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-sans block font-bold">SUPABASE_ANON_KEY (JWT):</span>
                      <span className="text-emerald-800 font-bold break-all select-all">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cGFheXdnbWNybGdoZnZ3enFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODE0ODgsImV4cCI6MjEwMDc1NzQ4OH0.C2v7APWCTb74aDIi23CvQ8ClZXTYm6Obs8Gipr-DQXQ</span>
                    </div>
                  </div>
                </div>

                {/* TABLES & RLS POLICIES STATUS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Tabelas de Dados & Políticas de Segurança RLS (Row Level Security)</span>
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      5 Tabelas Protegidas com RLS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* TABLE 1: PROFILES */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-extrabold text-teal-800">public.profiles</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">RLS Ativo</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Perfis de acesso vinculados ao Auth (Pacientes, Médicos e Admins).</p>
                      <div className="text-[10px] text-slate-500 space-y-1 font-mono bg-slate-50 p-2 rounded-lg">
                        <div>id: UUID (PK, FK auth.users)</div>
                        <div>email: TEXT, name: TEXT</div>
                        <div>role: 'patient' | 'doctor' | 'admin'</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <Shield className="h-3 w-3 text-emerald-600" />
                        <span>RLS: Leitura própria ou médicos / Escrita própria</span>
                      </div>
                    </div>

                    {/* TABLE 2: DOCTORS */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-extrabold text-teal-800">public.doctors</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">RLS Ativo</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Cadastro de médicos, especialidades e verificação ORMED.</p>
                      <div className="text-[10px] text-slate-500 space-y-1 font-mono bg-slate-50 p-2 rounded-lg">
                        <div>id: UUID (PK, FK profiles)</div>
                        <div>specialty_name, license_number</div>
                        <div>consultation_fee, approved: BOOL</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <Shield className="h-3 w-3 text-emerald-600" />
                        <span>RLS: Leitura pública autenticada / Edição do médico</span>
                      </div>
                    </div>

                    {/* TABLE 3: PATIENTS */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-extrabold text-teal-800">public.patients</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">RLS Ativo</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Histórico de pacientes, tipo sanguíneo e preferências.</p>
                      <div className="text-[10px] text-slate-500 space-y-1 font-mono bg-slate-50 p-2 rounded-lg">
                        <div>id: UUID (PK, FK profiles)</div>
                        <div>gender, province, blood_type</div>
                        <div>allergies: TEXT[], chronic_conditions</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <Shield className="h-3 w-3 text-emerald-600" />
                        <span>RLS: Paciente aceda seus dados e médico agendado</span>
                      </div>
                    </div>

                    {/* TABLE 4: APPOINTMENTS */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-extrabold text-teal-800">public.appointments</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">RLS Ativo</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Consultas de videochamada, horários e pagamentos.</p>
                      <div className="text-[10px] text-slate-500 space-y-1 font-mono bg-slate-50 p-2 rounded-lg">
                        <div>id: UUID (PK)</div>
                        <div>patient_id, doctor_id (FK profiles)</div>
                        <div>date, time, status, price, payment_status</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <Shield className="h-3 w-3 text-emerald-600" />
                        <span>RLS: Exclusivo ao Paciente e Médico participante</span>
                      </div>
                    </div>

                    {/* TABLE 5: MEDICAL_RECORDS */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs col-span-1 md:col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-mono text-xs font-extrabold text-teal-800">public.medical_records</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">RLS Ativo</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Prontuários clínicos, receitas digitais e triagens IA.</p>
                      <div className="text-[10px] text-slate-500 space-y-1 font-mono bg-slate-50 p-2 rounded-lg">
                        <div>id: UUID (PK)</div>
                        <div>patient_id, doctor_id, title, diagnosis</div>
                        <div>prescription, record_type, attachments</div>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <Shield className="h-3 w-3 text-emerald-600" />
                        <span>RLS: Acesso restrito ao Paciente e Médico assistente</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: ADD PLATFORM MANAGER */}
      {showAddManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                <h3 className="font-sans text-sm font-bold text-slate-800">Adicionar Gestor da Plataforma</h3>
              </div>
              <button
                onClick={() => setShowAddManagerModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo do Gestor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dra. Esperança Manuel"
                  value={mngName}
                  onChange={(e) => setMngName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Foto de Perfil (URL da Imagem) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={mngAvatarUrl}
                    onChange={(e) => setMngAvatarUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                  <img src={mngAvatarUrl} alt="Preview" className="h-8 w-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Função / Cargo de Gestão *</label>
                <select
                  value={mngRoleTitle}
                  onChange={(e: any) => {
                    setMngRoleTitle(e.target.value);
                    if (e.target.value === "Gestor Financeiro") setMngDept("Departamento Financeiro");
                    else if (e.target.value === "Gestor de Médicos") setMngDept("Corpo Clínico & ORMED");
                    else setMngDept("Apoio ao Cliente & Pacientes");
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-semibold"
                >
                  <option value="Gestor Financeiro">Gestor Financeiro (Relatórios & Repasses)</option>
                  <option value="Gestor de Médicos">Gestor de Médicos (Validação ORMED & Agenda)</option>
                  <option value="Gestor de Atendimento / Suporte">Gestor de Atendimento / Suporte</option>
                  <option value="Administrador Geral">Administrador Geral</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail de Trabalho</label>
                  <input
                    type="email"
                    placeholder="gestor@mwenho.ao"
                    value={mngEmail}
                    onChange={(e) => setMngEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Palavra-passe de Acesso</label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={mngPassword}
                    onChange={(e) => setMngPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telefone de Contacto</label>
                <input
                  type="tel"
                  placeholder="+244 923 888 999"
                  value={mngPhone}
                  onChange={(e) => setMngPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddManagerModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMng}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingMng ? "Cadastrando..." : "Confirmar e Registar Gestor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCTOR */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-900">Cadastrar Médico Credenciado (ORMED)</h3>
                  <p className="text-[11px] text-slate-500">Adicione foto e detalhes do médico parceiro</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Médico *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. António Kiala"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inscrição ORMED *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ORMED-AO 6920"
                    value={docOrmed}
                    onChange={(e) => setDocOrmed(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Foto de Perfil do Médico (URL) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={docAvatarUrl}
                    onChange={(e) => setDocAvatarUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                  <img src={docAvatarUrl} alt="Preview" className="h-8 w-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Especialidade Clínica *</label>
                  <select
                    value={docSpecialtyId}
                    onChange={(e) => setDocSpecialtyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  >
                    {specialties.map((sp, idx) => (
                      <option key={`sp-${sp.id}-${idx}`} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preço da Consulta (Kz) *</label>
                  <input
                    type="number"
                    required
                    value={docFee}
                    onChange={(e) => setDocFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail Profissional</label>
                  <input
                    type="email"
                    placeholder="dr.kiala@mwenho.ao"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Palavra-passe de Acesso</label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoc}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmittingDoc ? "Cadastrando..." : "Confirmar e Cadastrar Médico"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PATIENT (ADMIN) */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-900">Cadastrar Novo Paciente</h3>
                  <p className="text-[11px] text-slate-500">Adicione foto e dados do paciente para teleconsultas</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddPatientModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo do Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manuel João Neto"
                  value={patName}
                  onChange={(e) => setPatName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Foto de Perfil do Paciente (URL) *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={patAvatarUrl}
                    onChange={(e) => setPatAvatarUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                  <img src={patAvatarUrl} alt="Preview" className="h-8 w-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Endereço de E-mail</label>
                  <input
                    type="email"
                    placeholder="paciente@exemplo.com"
                    value={patEmail}
                    onChange={(e) => setPatEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Número de Telefone</label>
                  <input
                    type="tel"
                    placeholder="+244 923 000 111"
                    value={patPhone}
                    onChange={(e) => setPatPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Palavra-passe de Acesso</label>
                  <input
                    type="text"
                    placeholder="Padrão: 123456"
                    value={patPassword}
                    onChange={(e) => setPatPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data de Nascimento</label>
                  <input
                    type="date"
                    value={patDob}
                    onChange={(e) => setPatDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Género</label>
                <select
                  value={patGender}
                  onChange={(e) => setPatGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-teal-500 focus:outline-none font-semibold"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro / Não Especificado</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPat}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {isSubmittingPat ? "Cadastrando..." : "Confirmar Cadastro do Paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: SUPABASE SQL SCHEMA VIEWER */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 text-slate-100 p-6 shadow-2xl border border-slate-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-white">Esquema SQL do Supabase Database (com RLS)</h3>
                  <p className="text-xs text-slate-400">Tabelas: profiles, doctors, patients, appointments, medical_records</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sqlSchema);
                    alert("Código SQL copiado para a área de transferência!");
                  }}
                  className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 transition-colors shadow-sm"
                >
                  📋 Copiar SQL
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-teal-300 border border-slate-800 leading-relaxed select-all">
              <pre>{sqlSchema || "Carregando esquema SQL..."}</pre>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4 text-xs text-slate-400">
              <span className="text-[11px]">💡 Cole este script diretamente no <strong>SQL Editor</strong> do painel do Supabase.</span>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-slate-200 hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
