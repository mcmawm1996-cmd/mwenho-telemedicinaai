import React, { useState, useEffect } from "react";
import { User, DoctorProfile, MedicalSpecialty, Appointment, AIReport, Message, PatientProfile, AppointmentStatus } from "../types.js";
import { safeJson } from "../utils.js";
import { 
  Activity, Search, Calendar, History, MessageSquare, UploadCloud, 
  ShieldCheck, AlertTriangle, Clock, Stethoscope, CreditCard, Download, 
  Plus, X, ChevronRight, User as UserIcon, FileText, Sparkles, Video, HelpCircle, Eye, EyeOff, Trash2, CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import mwenhoProKv from "../assets/images/mwenho_pro_kv_1785011106828.jpg";

interface PatientDashboardProps {
  currentUser: User;
  doctors: DoctorProfile[];
  specialties: MedicalSpecialty[];
  appointments: Appointment[];
  notificationsCount: number;
  onBookAppointment: (doctorId: string, date: string, time: string, aiReportId?: string) => Promise<any>;
  onCancelAppointment: (id: string) => Promise<any>;
  onJoinVideoCall: (appointment: Appointment) => void;
  onRefreshData: () => void;
}

export default function PatientDashboard({
  currentUser,
  doctors,
  specialties,
  appointments,
  onBookAppointment,
  onCancelAppointment,
  onJoinVideoCall,
  onRefreshData
}: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<"triage" | "book" | "triageHistory" | "history" | "consultations">("triage");
  
  // Privacy & Consent states
  const [showPhiData, setShowPhiData] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // State for AI Triage chat & reports
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeTriageReport, setActiveTriageReport] = useState<AIReport | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [savedTriageReports, setSavedTriageReports] = useState<AIReport[]>([]);

  // State for Medical Profile
  const [patientProfile, setPatientProfile] = useState<PatientProfile & { name?: string; email?: string }>({
    id: currentUser.id,
    dateOfBirth: "1994-05-12",
    gender: "Masculino",
    bloodType: "O+",
    allergies: ["Penicilina", "Lactose"],
    chronicConditions: ["Hipertensão Leve"],
    medications: ["Enalapril 10mg"],
    insuranceProvider: "SulAmérica Saúde"
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newMedication, setNewMedication] = useState("");

  // Exam upload analyzer
  const [examText, setExamText] = useState("");
  const [examFileName, setExamFileName] = useState("");
  const [examAnalysis, setExamAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Booking & Payment state
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingStep, setBookingStep] = useState<"browse" | "schedule" | "payment" | "success">("browse");
  
  // Angolan Payment System state (MCX, KWIK, Unitel Money, eKwanza, PayPay)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"MCX" | "KWIK" | "UNITEL_MONEY" | "EKWANZA" | "PAYPAY">("MCX");
  const [mcxPhone, setMcxPhone] = useState("+244 923 000 111");
  const [kwikKey, setKwikKey] = useState("mwenho.telemed@kwik.ao");
  const [unitelPhone, setUnitelPhone] = useState("+244 923 000 111");
  const [ekwanzaId, setEkwanzaId] = useState("AO-EKW-902148");
  const [paypayId, setPaypayId] = useState("paypay.me/mwenho");
  
  const [isPaying, setIsPaying] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  // Subscription state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscribingPlan, setSubscribingPlan] = useState<"MONTHLY" | "TRIMESTRAL" | "ANNUAL" | null>(null);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  const handleActivateSubscription = async (planId: "MONTHLY" | "TRIMESTRAL" | "ANNUAL") => {
    setIsUpdatingSub(true);
    try {
      const res = await fetch(`/api/patients/${currentUser.id}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          paymentMethod: selectedPaymentMethod
        })
      });

      if (res.ok) {
        alert(`Subscrição ${planId === "MONTHLY" ? "Mensal (2.000 Kz)" : planId === "TRIMESTRAL" ? "Trimestral (5.400 Kz)" : "Anual (19.200 Kz)"} ativada com sucesso via ${selectedPaymentMethod}!`);
        setShowSubscriptionModal(false);
        setSubscribingPlan(null);
        onRefreshData();
      } else {
        alert("Erro ao processar ativação do plano.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão.");
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Fetch / Sync initial Patient Profile and Triage History
  const fetchPatientProfile = async () => {
    try {
      const res = await fetch(`/api/patients/${currentUser.id}`);
      if (res.ok) {
        const data = await safeJson(res);
        setPatientProfile(data);
      }
    } catch (e) {
      console.error("Error fetching patient profile", e);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`/api/messages/${currentUser.id}-ai`);
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) setChatMessages(data);
      }
    } catch (e) {
      console.error("Error fetching chat messages", e);
    }
  };

  const fetchTriageReports = async () => {
    try {
      const res = await fetch(`/api/ai/reports/${currentUser.id}`);
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) setSavedTriageReports(data);
      }
    } catch (e) {
      console.error("Error fetching saved triage reports", e);
    }
  };

  const handleDeleteTriageReport = async (reportId: string) => {
    // Instantaneous UI removal
    setSavedTriageReports(prev => prev.filter(r => r.id !== reportId));
    if (activeTriageReport?.id === reportId) {
      setActiveTriageReport(null);
    }
    try {
      await fetch(`/api/ai/reports/${reportId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error deleting triage report", err);
    }
  };

  useEffect(() => {
    fetchPatientProfile();
    fetchChatHistory();
    fetchTriageReports();
  }, [currentUser]);

  // Handle send message to AI
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userText = inputText;
    setInputText("");
    setIsSending(true);

    // optimistically add user message
    const tempMsg: Message = {
      id: "temp-" + Date.now(),
      chatId: `${currentUser.id}-ai`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: userText,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempMsg]);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: `${currentUser.id}-ai`,
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: userText
        })
      });
      if (response.ok) {
        const data = await safeJson(response);
        // data.aiMsg holds the response from Gemini
        fetchChatHistory();
      }
    } catch (error) {
      console.error("Error sending message to AI Triage", error);
    } finally {
      setIsSending(false);
    }
  };

  // Generate formal Triage Clinical Report with Gemini & Auto-Forward to Doctor
  const handleGenerateTriageReport = async () => {
    if (chatMessages.length < 1) {
      alert("Por favor, descreva os seus sintomas no chat com a IA antes de concluir a triagem.");
      return;
    }

    setTriageLoading(true);
    // Combine chat history as symptom description
    const lastUserMsgs = chatMessages
      .filter(m => m.senderId === currentUser.id)
      .map(m => m.text)
      .join(". ");

    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          symptoms: lastUserMsgs || "Paciente relata desconfortos sob triagem clínica conversacional."
        })
      });
      if (response.ok) {
        const report = await safeJson(response);
        setActiveTriageReport(report);
        fetchTriageReports();
        
        // Automatically suggest specialty and set filter
        const matchedSpecialty = specialties.find(sp => sp.name && report.suggestedSpecialty && (
          sp.name.toLowerCase().includes(report.suggestedSpecialty.toLowerCase()) ||
          report.suggestedSpecialty.toLowerCase().includes(sp.name.toLowerCase())
        ));

        if (matchedSpecialty) {
          setSelectedSpecialtyId(matchedSpecialty.id);
        } else {
          const fallback = specialties.find(sp => sp.name.toLowerCase().includes("geral")) || specialties[0];
          if (fallback) setSelectedSpecialtyId(fallback.id);
        }

        // Encaminhar automaticamente para a escolha de médicos e agendamento
        setActiveTab("book");
        setBookingStep("browse");
      }
    } catch (error) {
      console.error("Error generating triage report", error);
    } finally {
      setTriageLoading(false);
    }
  };

  // Clear AI triage chat history immediately
  const handleClearChat = async () => {
    // Instantaneous UI state clear
    setChatMessages([]);
    try {
      await fetch(`/api/messages/${currentUser.id}-ai`, { method: "DELETE" });
    } catch (error) {
      console.error("Error deleting chat history", error);
    }
  };

  // Update medical history on server
  const handleUpdateProfile = async (updatedData: any) => {
    try {
      const response = await fetch(`/api/patients/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        const data = await safeJson(response);
        setPatientProfile(prev => ({ ...prev, ...data }));
        setIsEditingProfile(false);
      }
    } catch (e) {
      console.error("Error updating patient profile", e);
    }
  };

  // Document clinical summaries
  const handleAnalyzeExam = async () => {
    if (!examText.trim()) return;
    setAnalysisLoading(true);
    try {
      const response = await fetch("/api/ai/summarize-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: examText,
          documentName: examFileName || "exame_upload.txt"
        })
      });
      if (response.ok) {
        const data = await safeJson(response);
        setExamAnalysis(data.summary);
      } else {
        setExamAnalysis("Erro ao obter análise do servidor. Verifique a chave de API.");
      }
    } catch (error) {
      console.error("Error analyzing exam text", error);
      setExamAnalysis("Ocorreu um erro ao conectar com o serviço de IA do Gemini.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Simulated file drop
  const handleFileDrop = (name: string, text: string) => {
    setExamFileName(name);
    setExamText(text);
  };

  // Confirm and Pay Booking
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !bookingDate || !bookingTime) return;
    setIsPaying(true);
    try {
      const apt = await onBookAppointment(
        selectedDoctor.id, 
        bookingDate, 
        bookingTime, 
        activeTriageReport?.id
      );
      if (apt) {
        // Automatically mark as PAID for high-fidelity mock payment
        const payRes = await fetch(`/api/appointments/${apt.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: AppointmentStatus.ACCEPTED, // Doctor automatically accepts for demo fluidness
            paymentStatus: "PAID"
          })
        });
        if (payRes.ok) {
          const paidApt = await safeJson(payRes);
          setBookedAppointment(paidApt);
          setBookingStep("success");
          onRefreshData();
        }
      }
    } catch (error) {
      console.error("Error booking appointment", error);
    } finally {
      setIsPaying(false);
    }
  };

  const handleStartNewBooking = (doc: DoctorProfile) => {
    setSelectedDoctor(doc);
    setBookingDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]); // tomorrow default
    setBookingTime(doc.availableSlots[0] || "09:00");
    setBookingStep("schedule");
    setActiveTab("book");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Key Visual Hero Campaign Banner (Mwenho TelemedAI - Vem Consulta) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <img
          src={mwenhoProKv}
          alt="Key Visual Telemedicina Mwenho TelemedAI"
          className="absolute inset-0 h-full w-full object-cover opacity-30 filter brightness-90 object-center"
          referrerPolicy="no-referrer"
        />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-teal-300 border border-teal-400/30">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              <span>Vem Consulta • Mwenho TelemedAI 🇦🇴</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Sua Saúde Digital Sem Barreiras
            </h1>
            <p className="text-xs text-teal-100/90 leading-relaxed">
              Realize triagem de sintomas por inteligência artificial, fale com médicos autorizados pela Ordem dos Médicos de Angola (ORMED) e receba receitas médicas digitais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab("triage")}
              className="rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-400 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Iniciar Triagem AI
            </button>
            <button
              onClick={() => setActiveTab("book")}
              className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4 text-teal-300" />
              Buscar Médico
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-teal-50/50 to-emerald-50/80 p-4 text-xs text-teal-950 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-teal-900">
                {currentUser.subscription?.planName || "Período Experimental (14 Dias Grátis)"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                currentUser.subscription?.isTrial ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-teal-600 text-white"
              }`}>
                {currentUser.subscription?.isTrial ? "Trial 14 Dias" : "Subscrição Ativa"}
              </span>
            </div>
            <p className="text-[11px] text-teal-700 mt-0.5">
              {currentUser.subscription?.isTrial
                ? `Aproveite ${currentUser.subscription?.trialDaysLeft ?? 14} dias restantes de triagem grátis. Subscrição mensal a apenas 2.000 Kz.`
                : `Plano ativo até ${currentUser.subscription?.expiryDate || "fim do período"}.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSubscriptionModal(true)}
          className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-800 transition-colors shrink-0"
        >
          Gerir Planos & Subscrição
        </button>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-sans text-lg font-bold tracking-tight text-slate-900">
              Olá, {showPhiData ? currentUser.name : (currentUser.name ? currentUser.name.split(" ")[0] + " •••••••" : "Paciente Mwenho")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Acompanhe seu histórico, consultas marcadas e relatórios de exames.
            </p>
          </div>
          <button
            onClick={() => setShowPhiData(!showPhiData)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Ocultar ou Exibir Dados Clínicos e Pessoais (PHI)"
          >
            {showPhiData ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-teal-600" />}
            <span>{showPhiData ? "Ocultar PHI" : "Mostrar PHI"}</span>
          </button>
        </div>

        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveTab("triage")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "triage"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sintomas e Triagem AI
          </button>
          <button
            onClick={() => setActiveTab("book")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "book"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Buscar Médicos
          </button>
          <button
            onClick={() => setActiveTab("triageHistory")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "triageHistory"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Histórico de Consultas
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Prontuário e Exames
          </button>
          <button
            onClick={() => setActiveTab("consultations")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "consultations"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Minhas Consultas
          </button>
        </div>
      </div>

      {/* Main Dashboard Tabs Container */}
      <div className="mt-8">
        
        {/* TAB 1: Symptoms AI and Triage */}
        {activeTab === "triage" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {!disclaimerAccepted ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 shadow-sm space-y-5 lg:col-span-3">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/60 px-3 py-1 text-[11px] font-bold text-amber-900">
                      <span>Termo de Consentimento Médico & Aviso Prévia de Triagem</span>
                    </div>
                    <h3 className="font-extrabold text-base text-amber-950">
                      Aviso Importante e Consentimento Livre e Esclarecido
                    </h3>
                    <p className="text-xs text-amber-900 leading-relaxed font-serif">
                      A Triagem de Sintomas realizada pelo assistente virtual <strong>Dr. AI</strong> é um recurso informativo preliminar projetado para orientá-lo sobre a urgência e a especialidade médica recomendada para o seu atendimento.
                    </p>
                    <p className="text-xs text-amber-900 leading-relaxed font-serif">
                      <strong>Atenção:</strong> Esta ferramenta <strong>NÃO constitui diagnóstico médico definitivo, nem prescrição de tratamentos</strong>. Ela não substitui a teleconsulta com um profissional médico credenciado pela Ordem dos Médicos de Angola (ORMED).
                    </p>
                    <div className="p-3 rounded-xl bg-red-100/80 border border-red-200 text-red-900 text-xs leading-relaxed space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                        Sinais de Emergência Médica Crítica
                      </p>
                      <p className="text-[11px] text-red-800">
                        Em caso de sintomas graves (dor aguda no peito, falta de ar severa, alteração da fala ou perda de consciência), dirija-se imediatamente ao serviço de urgência hospitalar mais próximo ou contacte o 112 / 116.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-amber-200/80">
                  <span className="text-[11px] text-amber-800 font-medium">
                    Ao clicar em aceitar, você confirma ter lido e concordado com o aviso médico.
                  </span>
                  <button
                    onClick={() => setDisclaimerAccepted(true)}
                    className="rounded-xl bg-teal-700 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-800 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-teal-300" />
                    Li, Compreendo e Aceito os Termos
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Left Col: Conversational Symptom Triaging Chatbot */}
                <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm lg:col-span-2 overflow-hidden h-[600px]">
              <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Sparkles className="h-5 w-5 text-teal-100" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Dr. AI — Triagem Inteligente</h3>
                    <p className="text-[10px] text-teal-100">Atendimento rápido, humano e especializado em saúde</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <button
                      onClick={handleClearChat}
                      title="Apagar Histórico de Conversa"
                      className="rounded-lg bg-teal-800/80 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 border border-teal-500/40 shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Apagar Conversa</span>
                    </button>
                  )}
                  <button
                    onClick={handleGenerateTriageReport}
                    disabled={triageLoading}
                    className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold hover:bg-teal-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {triageLoading ? (
                      <>Gerando...</>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4" />
                        Concluir Triagem e Ir para Médico
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat history list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-3">
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                      <Sparkles className="h-6 w-6 text-teal-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Olá! Seja muito bem-vindo(a) 👋</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-serif">
                      Sou o <strong>Dr. AI</strong>, o seu profissional assistente de saúde. Estou aqui para acolher os seus sintomas com todo o amor, carinho e dedicação. Descreva o que está a sentir para lhe responder com clareza e orientar os seus cuidados!
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${
                        msg.senderId === currentUser.id ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${
                          msg.senderId === currentUser.id 
                            ? "bg-slate-200 text-slate-800" 
                            : "bg-teal-600 text-white"
                        }`}
                      >
                        {msg.senderId === currentUser.id ? "EU" : "Dr. AI"}
                      </div>
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed shadow-sm whitespace-pre-wrap ${
                          msg.senderId === currentUser.id
                            ? "bg-slate-800 text-white"
                            : "bg-white text-slate-800 border border-slate-100"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-4 bg-white flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ex: Estou com febre de 38°C e dor de garganta há 2 dias..."
                  disabled={isSending}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="rounded-xl bg-teal-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  Enviar
                </button>
              </form>
            </div>

            {/* Right Col: AI Formulated Triage Report Outcome */}
            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  <h3 className="font-sans text-sm font-bold text-slate-800">Resultado da Triagem</h3>
                </div>

                {!activeTriageReport ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                    <HelpCircle className="h-8 w-8 mx-auto text-slate-300" />
                    <p>Converse com a IA ao lado e clique em <b>"Fechar Triagem"</b> para gerar seu prontuário pré-consulta estruturado.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Severity Banner */}
                    <div className={`flex items-center gap-3 rounded-xl p-3 border ${
                      activeTriageReport.severity === "Urgente" 
                        ? "bg-red-50 border-red-100 text-red-800"
                        : activeTriageReport.severity === "Alto"
                        ? "bg-amber-50 border-amber-100 text-amber-800"
                        : activeTriageReport.severity === "Moderado"
                        ? "bg-blue-50 border-blue-100 text-blue-800"
                        : "bg-green-50 border-green-100 text-green-800"
                    }`}>
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider block">Gravidade Estimada</span>
                        <span className="text-sm font-extrabold">{activeTriageReport.severity}</span>
                      </div>
                    </div>

                    {/* Matched specialty suggested */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Especialidade Recomendada</span>
                      <div className="mt-1 flex items-center gap-2 font-semibold text-slate-800 text-xs">
                        <Stethoscope className="h-4 w-4 text-teal-600" />
                        {activeTriageReport.suggestedSpecialty}
                      </div>
                    </div>

                    {/* Clinical Summary */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Resumo Clínico de IA</span>
                      <p className="mt-1.5 text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-serif">
                        {activeTriageReport.clinicalSummary}
                      </p>
                    </div>

                    {/* Auto search doctors CTA */}
                    <button
                      onClick={() => {
                        setActiveTab("book");
                        const sp = specialties.find(s => s.name.toLowerCase() === activeTriageReport.suggestedSpecialty.toLowerCase());
                        if (sp) setSelectedSpecialtyId(sp.id);
                      }}
                      className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-100 hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Buscar Médicos Disponíveis
                    </button>
                  </div>
                )}
              </div>

              {/* Urgencies alert */}
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 text-xs text-red-800 space-y-2">
                <h4 className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Sinais de Alerta Críticos
                </h4>
                <p className="leading-relaxed text-[11px] text-red-700">
                  Se você apresentar dor aguda intensa no peito, falta de ar extrema, perda súbita de movimentos/fala ou confusão severa, não faça triagem online. Procure um Banco de Urgência / Hospital imediatamente ou ligue 112 / 116 (Serviços de Emergência Médica de Angola).
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    )}

        {/* TAB 2: Book Doctor / Find Physicians */}
        {activeTab === "book" && (
          <div className="space-y-6">
            
            {/* Step-by-step Header */}
            <div className="flex items-center gap-2">
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === "browse" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-800"}`}>1</span>
              <span className="text-xs font-bold text-slate-700">Escolha o Médico</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === "schedule" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-800"}`}>2</span>
              <span className="text-xs font-bold text-slate-700">Data e Horário</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${bookingStep === "payment" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-800"}`}>3</span>
              <span className="text-xs font-bold text-slate-700">Pagamento Seguro</span>
            </div>

            {/* FLOW 1: Browse Specialties and Doctors */}
            {bookingStep === "browse" && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                
                {/* Left specialties filter sidebar */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Filtrar Especialidade</h3>
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setSelectedSpecialtyId("")}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                          selectedSpecialtyId === "" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Ver Todas
                      </button>
                      {specialties.map((sp) => (
                        <button
                          key={sp.id}
                          onClick={() => setSelectedSpecialtyId(sp.id)}
                          className={`w-full text-left px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
                            selectedSpecialtyId === sp.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {sp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right doctors grid */}
                <div className="lg:col-span-3 space-y-4">
                  {!activeTriageReport ? (
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/90 p-8 text-center shadow-sm space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-base font-extrabold text-slate-900">Acesso Restrito: Triagem de Sintomas Necessária</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Conforme as diretrizes clínicas da plataforma, o paciente deve ser atendido primeiro pela IA. A foto e os perfis dos médicos especialistas estarão disponíveis nesta tela imediatamente após você concluir a triagem.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("triage")}
                        className="mt-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4 text-teal-200" />
                        Iniciar Triagem com a IA Agora
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* AI Triage Referral Card */}
                      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 p-5 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">Encaminhamento Automático da Triagem IA</span>
                              <h4 className="text-sm font-extrabold text-teal-950">Especialidade Indicada: {activeTriageReport.suggestedSpecialty}</h4>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            activeTriageReport.severity === "Urgente" ? "bg-red-100 text-red-800" :
                            activeTriageReport.severity === "Alto" ? "bg-amber-100 text-amber-800" :
                            "bg-teal-100 text-teal-800"
                          }`}>
                            Gravidade: {activeTriageReport.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-teal-100 leading-relaxed font-serif">
                          <b>Resumo da Avaliação da IA:</b> {activeTriageReport.clinicalSummary}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-teal-900 pt-1">
                          <span>👇 Escolha o médico especialista abaixo para agendar e realizar o pagamento.</span>
                          <button
                            onClick={() => setActiveTab("triage")}
                            className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                          >
                            Refazer Triagem IA
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Médicos Certificados Disponíveis</h3>
                        <span className="text-xs text-slate-400">Total: {doctors.filter(d => d.approved && (!selectedSpecialtyId || d.specialtyId === selectedSpecialtyId)).length}</span>
                      </div>

                      {doctors.filter(d => d.approved && (!selectedSpecialtyId || d.specialtyId === selectedSpecialtyId)).length === 0 ? (
                        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                          <Stethoscope className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                          <h4 className="text-sm font-bold text-slate-700">Nenhum médico disponível no momento</h4>
                          <p className="mt-1 text-xs text-slate-500">
                            Os médicos cadastrados no sistema e aprovados pela administração médica aparecerão aqui para agendamento.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {doctors
                            .filter(d => d.approved && (!selectedSpecialtyId || d.specialtyId === selectedSpecialtyId))
                            .map((doc) => (
                              <div key={doc.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                                <div className="flex gap-4">
                                  <img
                                    src={doc.avatarUrl}
                                    alt={doc.name}
                                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-teal-50 shrink-0"
                                  />
                                  <div>
                                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-700">
                                      {doc.specialtyName}
                                    </span>
                                    <h4 className="mt-1 text-xs font-bold text-slate-800">{doc.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">{doc.licenseNumber}</p>
                                    
                                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                      <span>★</span>
                                      <span>{doc.rating.toFixed(1)}</span>
                                    </div>
                                  </div>
                                </div>

                                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed font-serif line-clamp-2">
                                  {doc.bio}
                                </p>

                                <div className="mt-4 border-t border-slate-50 pt-3 flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Valor Consulta</span>
                                    <span className="text-xs font-extrabold text-slate-800">{doc.consultationFee.toLocaleString("pt-AO")} Kz</span>
                                  </div>
                                  <button
                                    onClick={() => handleStartNewBooking(doc)}
                                    className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors"
                                  >
                                    Agendar
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FLOW 2: Schedule Time Slots */}
            {bookingStep === "schedule" && selectedDoctor && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold text-slate-800">Selecionar Data e Horário</h3>
                  <button onClick={() => setBookingStep("browse")} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <img src={selectedDoctor.avatarUrl} alt={selectedDoctor.name} className="h-12 w-12 rounded-xl object-cover" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{selectedDoctor.name}</h4>
                    <span className="text-[10px] text-teal-600 font-semibold">{selectedDoctor.specialtyName}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Disponível em: {selectedDoctor.availableDays.join(", ")}</span>
                  </div>
                </div>

                {/* Input Select Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escolha o Dia</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Grid slots select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Escolha o Horário Disponível</label>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedDoctor.availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setBookingTime(slot)}
                        className={`rounded-xl py-2.5 text-xs font-semibold border transition-all ${
                          bookingTime === slot 
                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setBookingStep("payment")}
                  disabled={!bookingDate || !bookingTime}
                  className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50"
                >
                  Prosseguir para Pagamento
                </button>
              </div>
            )}

            {/* FLOW 3: Payment details (Angolan Systems) */}
            {bookingStep === "payment" && selectedDoctor && (
              <div className="mx-auto max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-slate-800">Pagamento Angolano Seguro</h3>
                    <p className="text-[11px] text-slate-500">Selecione o seu método de pagamento preferido em Kwanzas (Kz)</p>
                  </div>
                  <button onClick={() => setBookingStep("schedule")} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-teal-50/60 border border-teal-100 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Serviço: Teleconsulta ({selectedDoctor.specialtyName})</span>
                    <span className="text-slate-800">{selectedDoctor.consultationFee.toLocaleString("pt-AO")} Kz</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Profissional:</span>
                    <span className="text-slate-800">{selectedDoctor.name}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Horário:</span>
                    <span className="text-slate-800">{bookingDate} às {bookingTime}</span>
                  </div>
                  <hr className="border-teal-100/60" />
                  <div className="flex justify-between font-extrabold text-teal-800 text-sm">
                    <span>Total em Kwanzas:</span>
                    <span>{selectedDoctor.consultationFee.toLocaleString("pt-AO")} Kz</span>
                  </div>
                </div>

                {/* 5 Angolan Payment Systems Selector */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sistemas de Pagamento Suportados</span>
                  
                  <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("MCX")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedPaymentMethod === "MCX"
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      💳 MCX
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("KWIK")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedPaymentMethod === "KWIK"
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ⚡ KWIK
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("UNITEL_MONEY")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedPaymentMethod === "UNITEL_MONEY"
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      📲 Unitel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("EKWANZA")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedPaymentMethod === "EKWANZA"
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      🇦🇴 eKwanza
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod("PAYPAY")}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        selectedPaymentMethod === "PAYPAY"
                          ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      📱 PayPay
                    </button>
                  </div>

                  {/* Payment Form Fields Based on Selected System */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    {selectedPaymentMethod === "MCX" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Multicaixa Express (MCX)</span>
                          <span className="text-[10px] text-teal-600">Notificação Push no Telemóvel</span>
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Número do Telemóvel Registado no Express</label>
                        <input
                          type="tel"
                          value={mcxPhone}
                          onChange={(e) => setMcxPhone(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                        <p className="text-[10px] text-slate-400">Ou utilize a referência: Entidade 00128 | Ref: 918 203 401</p>
                      </div>
                    )}

                    {selectedPaymentMethod === "KWIK" && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Transferência Instantânea KWIK</span>
                          <span className="text-[10px] text-teal-600">Chave Direta</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 font-mono text-[11px]">
                          <div><span className="text-slate-400">Chave KWIK:</span> <strong className="text-teal-700">{kwikKey}</strong></div>
                          <div><span className="text-slate-400">IBAN:</span> <strong className="text-slate-700">AO06.0040.0000.1234.5678.1018.9</strong></div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === "UNITEL_MONEY" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Carteira Unitel Money</span>
                          <span className="text-[10px] text-teal-600">Confirmação via USSD</span>
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Número Unitel Money</label>
                        <input
                          type="tel"
                          value={unitelPhone}
                          onChange={(e) => setUnitelPhone(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 bg-white"
                        />
                      </div>
                    )}

                    {selectedPaymentMethod === "EKWANZA" && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>eKwanza (Banco Central de Angola)</span>
                          <span className="text-[10px] text-teal-600">ID Digital</span>
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ID eKwanza da Plataforma</label>
                        <input
                          type="text"
                          readOnly
                          value={ekwanzaId}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono bg-white text-slate-700 font-bold"
                        />
                      </div>
                    )}

                    {selectedPaymentMethod === "PAYPAY" && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>PayPay Angola</span>
                          <span className="text-[10px] text-teal-600">Instantâneo</span>
                        </div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Chave PayPay Mwenho</label>
                        <input
                          type="text"
                          readOnly
                          value={paypayId}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono bg-white text-teal-700 font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  disabled={isPaying}
                  className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isPaying ? (
                    <>A validar pagamento em Kwanzas ({selectedPaymentMethod})...</>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Pagar {selectedDoctor.consultationFee.toLocaleString("pt-AO")} Kz via {selectedPaymentMethod}
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  Transações criptografadas em conformidade com o Banco Nacional de Angola (BNA) e MINSA.
                </p>
              </div>
            )}

            {/* FLOW 4: Success message */}
            {bookingStep === "success" && bookedAppointment && (
              <div className="mx-auto max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-sm text-center space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 shadow-inner">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-800">Consulta Agendada e Paga com Sucesso!</h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-normal">
                    Seu pagamento foi aprovado e a videoconferência está confirmada com o profissional.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 text-left text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-slate-400">Médico:</span><span className="font-bold text-slate-700">{bookedAppointment.doctorName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Data/Horário:</span><span className="font-bold text-slate-700">{bookedAppointment.date} às {bookedAppointment.time}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Código de Acesso:</span><span className="font-mono text-[11px] text-teal-600 font-bold">{bookedAppointment.videoRoomId}</span></div>
                </div>

                <button
                  onClick={() => {
                    setBookingStep("browse");
                    setActiveTab("consultations");
                  }}
                  className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition-colors"
                >
                  Ver Minhas Consultas
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: Histórico de Consultas e Relatórios IA */}
        {activeTab === "triageHistory" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white p-6 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Histórico de Consultas & Relatórios IA</h3>
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                      {savedTriageReports.length} {savedTriageReports.length === 1 ? "relatório" : "relatórios"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Consulte os relatórios anteriores gerados pela Inteligência Artificial de Triagem e agende consultas direcionadas.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("triage")}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Nova Triagem IA
              </button>
            </div>

            {savedTriageReports.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm space-y-4 max-w-lg mx-auto">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-inner">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-slate-800">Nenhum Relatório de Triagem Gravado</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Quando você realiza a Triagem Inteligente com a IA de Sintomas e conclui a avaliação, seus relatórios clínicos anteriores aparecerão arquivados aqui para consulta rápida.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("triage")}
                  className="mt-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-teal-200" />
                  Iniciar Primeira Triagem IA
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {savedTriageReports.slice().reverse().map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Header info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-teal-600" />
                          <span>
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleDateString("pt-AO", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "Data recente"}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          report.severity === "Urgente" ? "bg-red-100 text-red-800 border border-red-200" :
                          report.severity === "Alto" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          report.severity === "Moderado" ? "bg-teal-100 text-teal-800 border border-teal-200" :
                          "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          Gravidade: {report.severity}
                        </span>
                      </div>

                      {/* Suggested Specialty */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Especialidade Indicada:</span>
                        <span className="rounded-md bg-teal-50 border border-teal-100 px-2 py-0.5 text-xs font-extrabold text-teal-800">
                          {report.suggestedSpecialty}
                        </span>
                      </div>

                      {/* Symptoms */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sintomas Relatados</span>
                        <p className="text-xs text-slate-700 italic font-serif leading-relaxed line-clamp-3">
                          "{report.symptoms}"
                        </p>
                      </div>

                      {/* Clinical Summary */}
                      <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-100/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                          <span>Resumo da Avaliação Clínica da IA</span>
                        </div>
                        <p className="text-xs text-slate-700 font-serif leading-relaxed">
                          {report.clinicalSummary}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDeleteTriageReport(report.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Apagar este relatório do histórico"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Excluir</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTriageReport(report);
                          const matchedSpecialty = specialties.find(sp => sp.name && report.suggestedSpecialty && (
                            sp.name.toLowerCase().includes(report.suggestedSpecialty.toLowerCase()) ||
                            report.suggestedSpecialty.toLowerCase().includes(sp.name.toLowerCase())
                          ));
                          if (matchedSpecialty) {
                            setSelectedSpecialtyId(matchedSpecialty.id);
                          }
                          setActiveTab("book");
                          setBookingStep("browse");
                        }}
                        className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-1.5"
                      >
                        Agendar Especialista
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Patient Profile and Medical History Document summarizer */}
        {activeTab === "history" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            
            {/* Left Col: Clinical Record form */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-1 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-teal-600" />
                  <h3 className="font-sans text-sm font-bold text-slate-800">Seu Histórico Clínico</h3>
                </div>
                {!isEditingProfile ? (
                  <button onClick={() => setIsEditingProfile(true)} className="text-xs text-teal-600 font-bold hover:text-teal-700">Editar</button>
                ) : (
                  <button onClick={() => handleUpdateProfile(patientProfile)} className="text-xs text-green-600 font-bold hover:text-green-700">Salvar</button>
                )}
              </div>

              <div className="space-y-4">
                {/* Core fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Tipo Sanguíneo</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={patientProfile.bloodType}
                        onChange={(e) => setPatientProfile({ ...patientProfile, bloodType: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 focus:outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{showPhiData ? patientProfile.bloodType : "••"}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Gênero</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={patientProfile.gender}
                        onChange={(e) => setPatientProfile({ ...patientProfile, gender: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 focus:outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{patientProfile.gender}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Data de Nascimento</span>
                    {isEditingProfile ? (
                      <input
                        type="date"
                        value={patientProfile.dateOfBirth}
                        onChange={(e) => setPatientProfile({ ...patientProfile, dateOfBirth: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 focus:outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{showPhiData ? patientProfile.dateOfBirth : "••••-••-••"}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Plano de Saúde</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={patientProfile.insuranceProvider}
                        onChange={(e) => setPatientProfile({ ...patientProfile, insuranceProvider: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 p-1.5 focus:outline-none"
                      />
                    ) : (
                      <span className="font-bold text-slate-700">{patientProfile.insuranceProvider || "Nenhum"}</span>
                    )}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Allergies */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Alergias Registradas</span>
                  <div className="flex flex-wrap gap-1">
                    {patientProfile.allergies.length === 0 ? (
                      <span className="text-xs text-slate-400">Nenhuma alergia</span>
                    ) : (
                      patientProfile.allergies.map((al) => (
                        <span key={al} className="flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-[10px] font-semibold text-red-700">
                          {al}
                          {isEditingProfile && (
                            <button
                              onClick={() => {
                                const list = patientProfile.allergies.filter(item => item !== al);
                                handleUpdateProfile({ ...patientProfile, allergies: list });
                              }}
                              className="text-red-500 hover:text-red-700 font-extrabold"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingProfile && (
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Adicionar alergia..."
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!newAllergy.trim()) return;
                          const list = [...patientProfile.allergies, newAllergy.trim()];
                          setNewAllergy("");
                          handleUpdateProfile({ ...patientProfile, allergies: list });
                        }}
                        className="rounded-lg bg-teal-600 px-3 text-xs text-white hover:bg-teal-700"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Chronic Conditions */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Condições Crônicas</span>
                  <div className="flex flex-wrap gap-1">
                    {patientProfile.chronicConditions.length === 0 ? (
                      <span className="text-xs text-slate-400">Nenhuma condição crônica</span>
                    ) : (
                      patientProfile.chronicConditions.map((cond) => (
                        <span key={cond} className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          {cond}
                          {isEditingProfile && (
                            <button
                              onClick={() => {
                                const list = patientProfile.chronicConditions.filter(item => item !== cond);
                                handleUpdateProfile({ ...patientProfile, chronicConditions: list });
                              }}
                              className="text-amber-500 hover:text-amber-700 font-extrabold"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingProfile && (
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Adicionar condição..."
                        value={newCondition}
                        onChange={(e) => setNewCondition(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!newCondition.trim()) return;
                          const list = [...patientProfile.chronicConditions, newCondition.trim()];
                          setNewCondition("");
                          handleUpdateProfile({ ...patientProfile, chronicConditions: list });
                        }}
                        className="rounded-lg bg-teal-600 px-3 text-xs text-white hover:bg-teal-700"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Medicamentos de Uso Contínuo</span>
                  <div className="flex flex-wrap gap-1">
                    {patientProfile.medications.length === 0 ? (
                      <span className="text-xs text-slate-400">Nenhum medicamento registrado</span>
                    ) : (
                      patientProfile.medications.map((med) => (
                        <span key={med} className="flex items-center gap-1 rounded-full bg-teal-50 border border-teal-100 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700">
                          {med}
                          {isEditingProfile && (
                            <button
                              onClick={() => {
                                const list = patientProfile.medications.filter(item => item !== med);
                                handleUpdateProfile({ ...patientProfile, medications: list });
                              }}
                              className="text-teal-500 hover:text-teal-700 font-extrabold"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                  {isEditingProfile && (
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Adicionar medicamento..."
                        value={newMedication}
                        onChange={(e) => setNewMedication(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          if (!newMedication.trim()) return;
                          const list = [...patientProfile.medications, newMedication.trim()];
                          setNewMedication("");
                          handleUpdateProfile({ ...patientProfile, medications: list });
                        }}
                        className="rounded-lg bg-teal-600 px-3 text-xs text-white hover:bg-teal-700"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: PDF & Image Medical Report Summarizer (Gemini Integration) */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <UploadCloud className="h-5 w-5 text-teal-600" />
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-800">Resumidor de Exames e Laudos PDF</h3>
                  <p className="text-[10px] text-slate-400">Use nossa inteligência artificial para entender termos médicos complicados em laudos clínicos.</p>
                </div>
              </div>

              {/* Drag drop area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left drag-drop simulation container */}
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <FileText className="h-8 w-8 mx-auto text-slate-400" />
                    <h4 className="mt-2 text-xs font-bold text-slate-700">Simular Carregamento de Documento</h4>
                    <p className="mt-1 text-[10px] text-slate-400">Selecione um exame de teste rápido abaixo ou cole o laudo na caixa lateral.</p>
                    
                    {/* Dummy exams click generator */}
                    <div className="mt-4 flex flex-col gap-1.5 text-[10px] font-semibold text-slate-600">
                      <button
                        onClick={() => handleFileDrop("Hemograma_Completo.pdf", "HEMOGRAMA COMPLETO. Eritrócitos: 4.8 M/uL (Normal: 4.3-5.9). Hemoglobina: 14.2 g/dL (Normal: 13.5-17.5). Leucócitos totais: 11.500 /uL (Referência: 4.000 a 10.000). Neutrófilos bastonetes: 4% (Normal: 0-2). Plaquetas: 240.000 /uL (Normal: 150k-450k). Conclusão: Leucocitose discreta com desvio à esquerda sugerindo provável infecção bacteriana em curso ou processo inflamatório agudo.")}
                        className="rounded bg-teal-50 hover:bg-teal-100 px-2 py-1 text-teal-800 text-left"
                      >
                        📄 Hemograma Completo (Alterado)
                      </button>
                      <button
                        onClick={() => handleFileDrop("Exame_Cardiologico_ECG.txt", "Eletrocardiograma de repouso de 12 derivações. Ritmo sinusal regular, frequência cardíaca média: 82 bpm. Condução atrioventricular normal (Intervalo PR: 160ms). Complexo QRS estreito (80ms). Segmento ST com alteração difusa e discreta da repolarização ventricular, sem evidências agudas de isquemia coronariana obstrutiva no momento do traçado.")}
                        className="rounded bg-teal-50 hover:bg-teal-100 px-2 py-1 text-teal-800 text-left"
                      >
                        📄 Eletrocardiograma ECG (Normal)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Texto do Exame / Laudo Clínico</label>
                    <textarea
                      value={examText}
                      onChange={(e) => setExamText(e.target.value)}
                      placeholder="Cole aqui o conteúdo textual do exame (ex: laudo de sangue, ecografia, ressonância) para resumir..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:border-teal-500 font-mono leading-relaxed"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeExam}
                    disabled={analysisLoading || !examText.trim()}
                    className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {analysisLoading ? (
                      <>Analisando Exame com Gemini...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-teal-100" />
                        Explicar Exame com Inteligência Artificial
                      </>
                    )}
                  </button>
                </div>

                {/* Right outcome column */}
                <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/50 space-y-3 h-full overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    Análise Explicativa de IA
                  </h4>
                  
                  {!examAnalysis ? (
                    <div className="py-24 text-center text-[10px] text-slate-400 space-y-2">
                      <HelpCircle className="h-8 w-8 mx-auto text-slate-300" />
                      <p>O resultado do resumo simplificado do exame aparecerá aqui de forma estruturada e didática.</p>
                    </div>
                  ) : (
                    <div className="text-[11px] leading-relaxed text-slate-700 font-serif whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      {examAnalysis}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: My Consultations / Appointments queue */}
        {activeTab === "consultations" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Histórico de Agendamentos e Receitas Digitais</h3>

            {appointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center max-w-md mx-auto space-y-4">
                <Calendar className="h-10 w-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-800">Nenhuma consulta agendada</h4>
                <p className="text-xs text-slate-400">Você ainda não agendou nenhuma consulta médica online. Use o assistente ou busque médicos para agendar!</p>
                <button onClick={() => setActiveTab("book")} className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700">Agendar Agora</button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-3">
                      
                      {/* Doctor details */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 font-bold text-sm">
                          {apt.doctorName.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{apt.doctorName}</h4>
                          <span className="text-[10px] text-teal-600 font-semibold">{apt.doctorSpecialty}</span>
                        </div>
                      </div>

                      {/* Schedule slot */}
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {apt.date}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {apt.time}</div>
                      </div>

                      {/* Status flag */}
                      <div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          apt.status === AppointmentStatus.COMPLETED 
                            ? "bg-slate-100 text-slate-800"
                            : apt.status === AppointmentStatus.ACCEPTED
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : apt.status === AppointmentStatus.CANCELLED
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {apt.status === AppointmentStatus.COMPLETED 
                            ? "Concluída"
                            : apt.status === AppointmentStatus.ACCEPTED
                            ? "Confirmada"
                            : apt.status === AppointmentStatus.CANCELLED
                            ? "Cancelada"
                            : "Pendente"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Payment check */}
                      <div className="text-xs font-semibold">
                        <span className="text-slate-400">Pagamento:</span>
                        <span className="ml-1.5 text-slate-800">{apt.paymentStatus === "PAID" ? "💳 Pago (SulAmérica)" : "⚠️ Pendente"}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {apt.status === AppointmentStatus.ACCEPTED && (
                          <button
                            onClick={() => onJoinVideoCall(apt)}
                            className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-100 hover:bg-teal-700 transition-colors flex items-center gap-1.5 animate-pulse"
                          >
                            <Video className="h-3.5 w-3.5" />
                            Entrar na Chamada de Vídeo
                          </button>
                        )}

                        {apt.status === AppointmentStatus.PENDING && (
                          <button
                            onClick={() => onCancelAppointment(apt.id)}
                            className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                        
                        {/* Download prescription view if completed */}
                        {apt.prescription && (
                          <div className="rounded-xl bg-teal-50/50 p-3 border border-teal-100 w-full md:w-auto flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[9px] text-teal-800 font-extrabold uppercase tracking-wider block">Receita Digital Disponível</span>
                              <span className="text-[10px] text-slate-500 font-medium">Emitida por {apt.prescription.doctorName}</span>
                            </div>
                            <button
                              onClick={() => {
                                alert(`[RECEITA DIGITAL]
Médico: ${apt.prescription?.doctorName}
Data: ${apt.prescription?.date}
Medicamentos:
${apt.prescription?.medicines.map(m => `- ${m.name}: ${m.dosage} (${m.frequency}) para ${m.duration}`).join("\n")}

Observações: ${apt.prescription?.instructions}
Assinatura Digital Valida: ${apt.prescription?.digitalSignature}`);
                              }}
                              className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white p-2 text-xs"
                              title="Visualizar Receita"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUBSCRIPTION MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-900">Planos e Subscrição Mwenho TelemedAI</h3>
                  <p className="text-xs text-slate-500">Escolha o seu plano com pagamentos nos sistemas nacionais de Angola</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubscribingPlan(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Trial status banner */}
            <div className="rounded-2xl bg-teal-50 border border-teal-200 p-4 text-xs text-teal-900 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Status Atual: {currentUser.subscription?.planName || "Período Experimental (14 Dias Grátis)"}</span>
                <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[9px] text-white uppercase tracking-wider">
                  {currentUser.subscription?.isTrial ? "Trial" : "Ativo"}
                </span>
              </div>
              <p className="text-[11px] text-teal-700">
                {currentUser.subscription?.isTrial
                  ? `Seu período experimental de 14 dias grátis está ativo. Quando expirar, escolha a subscrição de 2.000 Kz/mês.`
                  : `Sua subscrição em Kwanzas foi confirmada e está válida.`}
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* PLAN 1: Mensal */}
              <div className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                subscribingPlan === "MONTHLY" ? "border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-600" : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Recomendado</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-0.5">Plano Mensal</h4>
                  <div className="mt-2 text-xl font-extrabold text-teal-700">
                    2.000 <span className="text-xs font-semibold text-slate-500">Kz / mês</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Acesso contínuo à Triagem Inteligente AI e agendamento rápido de teleconsultas.
                  </p>
                </div>
                <button
                  onClick={() => setSubscribingPlan("MONTHLY")}
                  className={`w-full rounded-xl py-2 text-xs font-bold transition-all ${
                    subscribingPlan === "MONTHLY" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {subscribingPlan === "MONTHLY" ? "Selecionado" : "Escolher Mensal"}
                </button>
              </div>

              {/* PLAN 2: Trimestral */}
              <div className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                subscribingPlan === "TRIMESTRAL" ? "border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-600" : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Poupe 10%</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-0.5">Plano Trimestral</h4>
                  <div className="mt-2 text-xl font-extrabold text-teal-700">
                    5.400 <span className="text-xs font-semibold text-slate-500">Kz / 3 meses</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Apenas 1.800 Kz/mês. Ideal para acompanhamento continuado de saúde familiar.
                  </p>
                </div>
                <button
                  onClick={() => setSubscribingPlan("TRIMESTRAL")}
                  className={`w-full rounded-xl py-2 text-xs font-bold transition-all ${
                    subscribingPlan === "TRIMESTRAL" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {subscribingPlan === "TRIMESTRAL" ? "Selecionado" : "Escolher Trimestral"}
                </button>
              </div>

              {/* PLAN 3: Anual */}
              <div className={`rounded-2xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                subscribingPlan === "ANNUAL" ? "border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-600" : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">Poupe 20%</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-0.5">Plano Anual</h4>
                  <div className="mt-2 text-xl font-extrabold text-teal-700">
                    19.200 <span className="text-xs font-semibold text-slate-500">Kz / ano</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Apenas 1.600 Kz/mês com prioridade nas consultas e relatórios em PDF.
                  </p>
                </div>
                <button
                  onClick={() => setSubscribingPlan("ANNUAL")}
                  className={`w-full rounded-xl py-2 text-xs font-bold transition-all ${
                    subscribingPlan === "ANNUAL" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {subscribingPlan === "ANNUAL" ? "Selecionado" : "Escolher Anual"}
                </button>
              </div>
            </div>

            {/* Payment Systems Selection for Subscription */}
            {subscribingPlan && (
              <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pagar via Sistema Angolano</span>
                
                <div className="grid grid-cols-5 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("MCX")}
                    className={`p-2 rounded-xl border text-center font-bold ${selectedPaymentMethod === "MCX" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white"}`}
                  >
                    💳 MCX
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("KWIK")}
                    className={`p-2 rounded-xl border text-center font-bold ${selectedPaymentMethod === "KWIK" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white"}`}
                  >
                    ⚡ KWIK
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("UNITEL_MONEY")}
                    className={`p-2 rounded-xl border text-center font-bold ${selectedPaymentMethod === "UNITEL_MONEY" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white"}`}
                  >
                    📲 Unitel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("EKWANZA")}
                    className={`p-2 rounded-xl border text-center font-bold ${selectedPaymentMethod === "EKWANZA" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white"}`}
                  >
                    🇦🇴 eKwanza
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("PAYPAY")}
                    className={`p-2 rounded-xl border text-center font-bold ${selectedPaymentMethod === "PAYPAY" ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white"}`}
                  >
                    📱 PayPay
                  </button>
                </div>

                <button
                  onClick={() => handleActivateSubscription(subscribingPlan)}
                  disabled={isUpdatingSub}
                  className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isUpdatingSub ? "Ativando Subscrição..." : `Confirmar Subscrição via ${selectedPaymentMethod}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
