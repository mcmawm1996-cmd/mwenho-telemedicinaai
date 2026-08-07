import React, { useState, useEffect } from "react";
import { User, DoctorProfile, Appointment, PatientProfile, UserRole, AppointmentStatus } from "../types.js";
import { safeJson } from "../utils.js";
import { 
  Check, X, Activity, Calendar, User as UserIcon, Clock, ClipboardList, 
  Stethoscope, Sparkles, Plus, Trash, Video, ExternalLink, FileText, Brain, ShieldCheck,
  MessageSquare, Mic, Send, Download, FileCheck, PhoneCall, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";

interface DoctorDashboardProps {
  currentUser: User;
  appointments: Appointment[];
  onAcceptAppointment: (id: string) => Promise<any>;
  onRejectAppointment: (id: string) => Promise<any>;
  onJoinVideoCall: (appointment: Appointment) => void;
  onRefreshData: () => void;
}

export default function DoctorDashboard({
  currentUser,
  appointments,
  onAcceptAppointment,
  onRejectAppointment,
  onJoinVideoCall,
  onRefreshData
}: DoctorDashboardProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "profile" | "history">("queue");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [patientExams, setPatientExams] = useState<any[]>([]);

  // Active view mode in patient workspace: "chat", "video", "prescription", "documents"
  const [workspaceMode, setWorkspaceMode] = useState<"chat" | "video" | "prescription" | "documents">("chat");

  // Messaging & Audio Chat State
  const [chatMessages, setChatMessages] = useState<{ sender: "doctor" | "patient"; text?: string; isAudio?: boolean; audioDuration?: string; time: string }[]>([]);
  const [newMsgText, setNewMsgText] = useState("");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  // AI assistant states
  const [aiInsights, setAiInsights] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Prescription pad states
  const [medicines, setMedicines] = useState<{ name: string; dosage: string; frequency: string; duration: string }[]>([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [prescriptionInstructions, setPrescriptionInstructions] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [prescriptionSigned, setPrescriptionSigned] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);

  // Doctor profile edit & schedule state
  const [docProfile, setDocProfile] = useState<DoctorProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [ormedFileStatus, setOrmedFileStatus] = useState<string>("");

  const handleToggleDay = (day: string) => {
    if (!docProfile) return;
    const current = docProfile.availableDays || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setDocProfile({ ...docProfile, availableDays: updated });
  };

  const handleAddSlot = () => {
    if (!docProfile || !newSlotTime.trim()) return;
    const current = docProfile.availableSlots || [];
    if (!current.includes(newSlotTime.trim())) {
      setDocProfile({ ...docProfile, availableSlots: [...current, newSlotTime.trim()].sort() });
    }
    setNewSlotTime("");
  };

  const handleRemoveSlot = (slot: string) => {
    if (!docProfile) return;
    const current = docProfile.availableSlots || [];
    setDocProfile({ ...docProfile, availableSlots: current.filter(s => s !== slot) });
  };

  const handleOrmedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docProfile) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setDocProfile({
        ...docProfile,
        ormedDocumentName: file.name,
        ormedDocumentUrl: base64
      });
      setOrmedFileStatus(`Ficheiro "${file.name}" anexado e pronto para envio.`);
    };
    reader.readAsDataURL(file);
  };

  // Fetch doctor profile
  const fetchDoctorProfile = async () => {
    try {
      const res = await fetch(`/api/doctors?approvedOnly=false`);
      if (res.ok) {
        const list = await safeJson(res);
        if (Array.isArray(list)) {
          const myProfile = list.find((d: any) => d.id === currentUser.id);
          if (myProfile) setDocProfile(myProfile);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, [currentUser]);

  // Handle patient background details fetch
  const handleSelectAppointment = async (apt: Appointment) => {
    setSelectedAppointment(apt);
    setAiInsights("");
    setDoctorNotes(apt.doctorNotes || "");
    setWorkspaceMode("chat");
    
    // reset prescription pad
    setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
    setPrescriptionInstructions("");
    setPrescriptionSigned(false);

    try {
      const [resDetails, resExams] = await Promise.all([
        fetch(`/api/patients/${apt.patientId}`),
        fetch(`/api/patients/${apt.patientId}/exams`)
      ]);

      if (resDetails.ok) {
        const details = await safeJson(resDetails);
        setPatientDetails(details);
      }
      if (resExams.ok) {
        const exams = await safeJson(resExams);
        if (Array.isArray(exams)) setPatientExams(exams);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: "doctor",
        text: newMsgText.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setNewMsgText("");
  };

  const handleSendVoiceNote = () => {
    setIsRecordingAudio(true);
    setTimeout(() => {
      setIsRecordingAudio(false);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "doctor",
          isAudio: true,
          audioDuration: "0:24",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const handleUpdateStatus = async (status: AppointmentStatus) => {
    if (!selectedAppointment) return;
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSelectedAppointment({ ...selectedAppointment, status });
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Gemini Clinical Assistant
  const handleTriggerClinicalAi = async () => {
    if (!selectedAppointment || !patientDetails) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/clinician-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientProfile: patientDetails,
          appointmentHistory: appointments.filter(a => a.patientId === selectedAppointment.patientId && a.id !== selectedAppointment.id),
          triageSymptom: selectedAppointment.aiReportId ? "Sintomas de dor de cabeça sob checkup de IA" : "Rotina cardiovascular periódica."
        })
      });
      if (response.ok) {
        const data = await safeJson(response);
        setAiInsights(data.insights);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Add prescription rows
  const handleAddMedicineRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleUpdateMedicineRow = (index: number, field: string, value: string) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleRemoveMedicineRow = (index: number) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
  };

  // Save clinical notes and digital prescription
  const handleSaveConsultationData = async () => {
    if (!selectedAppointment) return;
    setPrescriptionLoading(true);

    try {
      // Save doctor notes
      await fetch(`/api/appointments/${selectedAppointment.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorNotes })
      });

      // Save prescription if filled out
      const validMedicines = medicines.filter(m => m.name.trim() !== "");
      if (validMedicines.length > 0) {
        await fetch(`/api/appointments/${selectedAppointment.id}/prescription`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicines: validMedicines,
            instructions: prescriptionInstructions
          })
        });
      }

      // Mark appointment completed
      const finalRes = await fetch(`/api/appointments/${selectedAppointment.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: AppointmentStatus.COMPLETED })
      });

      if (finalRes.ok) {
        setPrescriptionSigned(true);
        setSelectedAppointment(null);
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const handleUpdateDoctorProfileOnServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docProfile) return;
    try {
      const res = await fetch(`/api/doctors/${docProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docProfile)
      });
      if (res.ok) {
        setIsEditingProfile(false);
        fetchDoctorProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title section */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">
            Painel do Médico
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie sua agenda de consultas virtuais, emita receitas eletrônicas e use a Inteligência Artificial como assistente clínica diagnóstica.
          </p>
        </div>

        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "queue"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Fila de Consultas
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Configurações do Consultório
          </button>
        </div>
      </div>

      <div className="mt-8">
        {/* Pending Approval Notice Banner */}
        {docProfile && !docProfile.approved && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm flex items-start gap-3 text-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Perfil em Análise — Aguardando Credenciamento do Administrador</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                A sua inscrição ORMED e dados profissionais estão sob validação da Administração Mwenho TelemedAI. O seu perfil estará visível para agendamento pelos pacientes assim que o Administrador aprovar o seu cadastro.
              </p>
            </div>
          </div>
        )}
        
        {/* TAB 1: Queue and active workspace */}
        {activeTab === "queue" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            
            {/* Left Column: Appointments lists */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-teal-600" />
                Seus Pacientes Agendados
              </h3>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {appointments.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400">
                    Nenhuma consulta agendada para você.
                  </div>
                ) : (
                  appointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => handleSelectAppointment(apt)}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                        selectedAppointment?.id === apt.id
                          ? "bg-teal-50/40 border-teal-200 shadow-sm"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{apt.patientName}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Consulta Virtual</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          apt.status === AppointmentStatus.COMPLETED 
                            ? "bg-slate-100 text-slate-600"
                            : apt.status === AppointmentStatus.ACCEPTED
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {apt.status === AppointmentStatus.COMPLETED 
                            ? "Concluído"
                            : apt.status === AppointmentStatus.ACCEPTED
                            ? "Confirmado"
                            : "Pendente"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                        <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {apt.date}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {apt.time}</div>
                      </div>

                      {/* Pending controls */}
                      {apt.status === AppointmentStatus.PENDING && (
                        <div className="mt-4 border-t border-slate-100/60 pt-3 flex gap-2 justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); onRejectAppointment(apt.id); }}
                            className="rounded-lg border border-red-200 px-3 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50"
                          >
                            Recusar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onAcceptAppointment(apt.id); }}
                            className="rounded-lg bg-teal-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-teal-700"
                          >
                            Aceitar
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Workspace for selected patient */}
            <div className="lg:col-span-2 space-y-6">
              {!selectedAppointment ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-24 text-center text-xs text-slate-400 space-y-3">
                  <Stethoscope className="h-10 w-10 mx-auto text-slate-300" />
                  <p>Selecione um paciente na lista lateral para abrir o prontuário eletrônico completo, videoconferência e receitas.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Workspace header */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Consulta Virtual Ativa</span>
                          {/* Status toggle buttons */}
                          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                            <button
                              onClick={() => handleUpdateStatus(AppointmentStatus.ACCEPTED)}
                              className={`rounded-md px-2 py-0.5 transition-colors ${selectedAppointment.status === AppointmentStatus.ACCEPTED ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                            >
                              Consulta Aberta
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(AppointmentStatus.PENDING)}
                              className={`rounded-md px-2 py-0.5 transition-colors ${selectedAppointment.status === AppointmentStatus.PENDING ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
                            >
                              Pendente
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(AppointmentStatus.COMPLETED)}
                              className={`rounded-md px-2 py-0.5 transition-colors ${selectedAppointment.status === AppointmentStatus.COMPLETED ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                            >
                              Resolvido
                            </button>
                          </div>
                        </div>
                        <h3 className="font-sans text-sm font-extrabold text-slate-800 mt-1">{selectedAppointment.patientName}</h3>
                        {patientDetails && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Nascimento: {patientDetails.dateOfBirth} | Gênero: {patientDetails.gender} | Sangue: {patientDetails.bloodType}
                          </p>
                        )}
                      </div>

                      {selectedAppointment.status === AppointmentStatus.ACCEPTED && (
                        <button
                          onClick={() => onJoinVideoCall(selectedAppointment)}
                          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-100 hover:bg-teal-700 transition-colors flex items-center gap-1.5"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Chamada de Vídeo Directa
                        </button>
                      )}
                    </div>

                    {/* Patient health profile info list */}
                    {patientDetails && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-50 pt-3 text-[10px]">
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-slate-400 block font-bold uppercase tracking-wider">Alergias</span>
                          <span className="font-semibold text-red-700 mt-1 block">
                            {patientDetails.allergies?.join(", ") || "Nenhuma alergia relatada"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-slate-400 block font-bold uppercase tracking-wider">Histórico Crônico</span>
                          <span className="font-semibold text-slate-800 mt-1 block">
                            {patientDetails.chronicConditions?.join(", ") || "Nenhum histórico crônico"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-slate-400 block font-bold uppercase tracking-wider">Remédios em Uso</span>
                          <span className="font-semibold text-slate-800 mt-1 block">
                            {patientDetails.medications?.join(", ") || "Nenhum remédio contínuo"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Workspace Mode Sub-Navigation Tabs */}
                    <div className="flex items-center gap-1 border-t border-slate-100 pt-3 text-xs font-bold">
                      <button
                        onClick={() => setWorkspaceMode("chat")}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors ${
                          workspaceMode === "chat" ? "bg-teal-50 text-teal-800 border border-teal-100" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Atendimento Mensagem / Áudio
                      </button>

                      <button
                        onClick={() => setWorkspaceMode("prescription")}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors ${
                          workspaceMode === "prescription" ? "bg-teal-50 text-teal-800 border border-teal-100" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Diagnóstico & Receita
                      </button>

                      <button
                        onClick={() => setWorkspaceMode("documents")}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors ${
                          workspaceMode === "documents" ? "bg-teal-50 text-teal-800 border border-teal-100" : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Exames ({patientExams.length})
                      </button>
                    </div>
                  </div>

                  {/* WORKSPACE MODE 1: CHAT VIA MESSAGES & AUDIO */}
                  {workspaceMode === "chat" && (
                    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col h-[480px]">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-teal-600" />
                          <h4 className="text-xs font-bold text-slate-800">Atendimento por Mensagem e Áudio</h4>
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                          Paciente Online
                        </span>
                      </div>

                      {/* Chat Messages Feed */}
                      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 text-xs">
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.sender === "doctor" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm space-y-1 ${
                                msg.sender === "doctor"
                                  ? "bg-teal-600 text-white rounded-br-none"
                                  : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                              }`}
                            >
                              {msg.isAudio ? (
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${msg.sender === "doctor" ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-700"}`}>
                                    <Mic className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-bold block text-[11px]">Mensagem de Voz</span>
                                    <span className="text-[10px] opacity-80">{msg.audioDuration}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="leading-relaxed">{msg.text}</p>
                              )}
                              <span className={`text-[9px] block text-right opacity-70`}>{msg.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chat Input Bar */}
                      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendVoiceNote}
                          disabled={isRecordingAudio}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isRecordingAudio 
                              ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                          title="Gravar Áudio de Atendimento"
                        >
                          <Mic className="h-4 w-4" />
                        </button>

                        <input
                          type="text"
                          value={newMsgText}
                          onChange={(e) => setNewMsgText(e.target.value)}
                          placeholder="Escreva uma mensagem médica ao paciente..."
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                        />

                        <button
                          type="submit"
                          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-1"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Enviar</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* WORKSPACE MODE 2: DOCUMENTS & EXAMS */}
                  {workspaceMode === "documents" && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-teal-600" />
                          <h4 className="text-xs font-bold text-slate-800">Exames e Laudos Anexados pelo Paciente</h4>
                        </div>
                      </div>

                      {patientExams.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                          <FileText className="h-8 w-8 mx-auto text-slate-300" />
                          <p>Nenhum exame em PDF/Imagem carregado por este paciente ainda.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {patientExams.map((ex: any) => (
                            <div key={ex.id} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-900 text-xs block">{ex.fileName}</span>
                                <span className="text-[10px] text-slate-400 block">Tipo: {ex.examType} | Data: {new Date(ex.createdAt).toLocaleDateString()}</span>
                                {ex.aiInterpretation && (
                                  <p className="text-[11px] text-teal-800 bg-teal-50/80 p-2 rounded-lg font-serif mt-2 border border-teal-100/60">
                                    💡 <strong>Análise da IA:</strong> {ex.aiInterpretation}
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() => alert(`A descarregar ficheiro: ${ex.fileName}`)}
                                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 flex items-center gap-1.5"
                              >
                                <Download className="h-3.5 w-3.5 text-teal-400" />
                                <span>Descarregar Exame</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clinician diagnostic copilot powered by Gemini */}
                  <div className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/10 to-teal-50/30 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-teal-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Assistente Clínico Inteligente</h4>
                          <span className="text-[9px] text-slate-400 block">IA diagnóstica e anamnese de suporte ao profissional</span>
                        </div>
                      </div>
                      <button
                        onClick={handleTriggerClinicalAi}
                        disabled={aiLoading}
                        className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {aiLoading ? (
                          <>Gerando insights...</>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Analisar Prontuário
                          </>
                        )}
                      </button>
                    </div>

                    {aiInsights && (
                      <div className="text-[11px] leading-relaxed text-slate-700 font-serif border border-teal-100/60 bg-white p-4 rounded-xl shadow-inner whitespace-pre-line max-h-48 overflow-y-auto">
                        {aiInsights}
                      </div>
                    )}
                  </div>

                  {/* Consultation form: digital prescription and doctor notes */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                      <FileText className="h-5 w-5 text-teal-600" />
                      <h4 className="text-xs font-bold text-slate-800">Prontuário Eletrônico e Receituário</h4>
                    </div>

                    {/* Doctor notes text field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sintomatologia e Conduta Médica (Notas Clínicas)</label>
                      <textarea
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        placeholder="Descreva a evolução do paciente, achados clínicos e conduta recomendada..."
                        rows={4}
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:border-teal-500 font-serif leading-relaxed"
                      />
                    </div>

                    {/* Interactive Prescription details */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medicamentos Prescritos</label>
                        <button
                          onClick={handleAddMedicineRow}
                          className="text-xs text-teal-600 font-bold hover:text-teal-700 flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar Medicamento
                        </button>
                      </div>

                      {medicines.map((med, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border-b border-slate-50 pb-3">
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400">Nome do Remédio</span>
                            <input
                              type="text"
                              value={med.name}
                              placeholder="Ex: Amoxicilina 500mg"
                              onChange={(e) => handleUpdateMedicineRow(index, "name", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none focus:border-teal-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400">Dosagem</span>
                            <input
                              type="text"
                              value={med.dosage}
                              placeholder="Ex: 1 comprimido"
                              onChange={(e) => handleUpdateMedicineRow(index, "dosage", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400">Frequência</span>
                            <input
                              type="text"
                              value={med.frequency}
                              placeholder="Ex: A cada 8 horas"
                              onChange={(e) => handleUpdateMedicineRow(index, "frequency", e.target.value)}
                              className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-1.5 items-center">
                            <div className="space-y-1 flex-1">
                              <span className="text-[9px] text-slate-400">Duração</span>
                              <input
                                type="text"
                                value={med.duration}
                                placeholder="Ex: 7 dias"
                                onChange={(e) => handleUpdateMedicineRow(index, "duration", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-1.5 text-xs focus:outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveMedicineRow(index)}
                              className="text-red-500 hover:text-red-700 mt-4 p-1"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Instructions for medicines */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Instruções de Uso / Recomendações Dietéticas</label>
                        <textarea
                          value={prescriptionInstructions}
                          onChange={(e) => setPrescriptionInstructions(e.target.value)}
                          placeholder="Ex: Tomar de estômago cheio. Evitar laticínios..."
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveConsultationData}
                      disabled={prescriptionLoading}
                      className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {prescriptionLoading ? (
                        <>Emitindo Receita e Conduta...</>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Assinar Digitalmente e Finalizar Atendimento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Office settings and profiles */}
        {activeTab === "profile" && docProfile && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-sans text-sm font-bold text-slate-800">Seu Perfil Profissional</h3>
              {!isEditingProfile ? (
                <button onClick={() => setIsEditingProfile(true)} className="text-xs text-teal-600 font-bold hover:text-teal-700">Editar Perfil</button>
              ) : (
                <button onClick={() => setIsEditingProfile(false)} className="text-xs text-slate-400 font-bold hover:text-slate-600">Cancelar</button>
              )}
            </div>

            <form onSubmit={handleUpdateDoctorProfileOnServer} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Inscrição de Classe (ORMED)</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={docProfile.licenseNumber}
                    onChange={(e) => setDocProfile({ ...docProfile, licenseNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Preço da Consulta (Kz)</label>
                    <span className="text-[9px] text-amber-600 font-semibold">★ Fixado pelo Admin</span>
                  </div>
                  <input
                    type="text"
                    disabled={true}
                    readOnly
                    value={`${docProfile.consultationFee.toLocaleString("pt-AO")} Kz`}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-100/80 font-bold text-slate-700 cursor-not-allowed"
                  />
                  <span className="text-[9px] text-slate-400 block">O valor da consulta é gerido e alterado exclusivamente pelo Administrador da plataforma.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Apresentação / Minibiografia</label>
                <textarea
                  disabled={!isEditingProfile}
                  value={docProfile.bio}
                  onChange={(e) => setDocProfile({ ...docProfile, bio: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 p-2.5 focus:outline-none disabled:bg-slate-50 font-serif leading-relaxed"
                />
              </div>

              {/* Schedule Management Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  <h4 className="font-bold text-xs">Minha Agenda & Horários de Atendimento</h4>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dias Semanais Disponíveis</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => {
                      const isSelected = (docProfile.availableDays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Horários de Consulta Configurados</span>
                  <div className="flex flex-wrap gap-2">
                    {(docProfile.availableSlots || []).map(slot => (
                      <span key={slot} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-100">
                        <Clock className="h-3 w-3 text-teal-600" />
                        {slot}
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot)}
                          className="hover:text-red-600 ml-1 font-bold text-slate-400"
                          title="Remover horário"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Ex: 08:30 ou 16:30"
                      value={newSlotTime}
                      onChange={(e) => setNewSlotTime(e.target.value)}
                      className="rounded-xl border border-slate-200 p-2 text-xs focus:outline-none w-36"
                    />
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Horário
                    </button>
                  </div>
                </div>
              </div>

              {/* ORMED Documentation Upload Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800">
                    <FileCheck className="h-4 w-4 text-teal-600" />
                    <h4 className="font-bold text-xs">Comprovativo da Ordem dos Médicos (ORMED)</h4>
                  </div>
                  {docProfile.ormedDocumentName && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-semibold border border-green-200">
                      <ShieldCheck className="h-3 w-3" /> Anexado
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Carregue a foto ou PDF da sua carteira da ORMED para verificação oficial.
                </p>

                {docProfile.ormedDocumentName && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-700 truncate">{docProfile.ormedDocumentName}</span>
                    <span className="text-[10px] text-teal-600 font-bold">Verificado</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span>{docProfile.ormedDocumentName ? "Substituir Ficheiro ORMED" : "Submeter Comprovativo ORMED"}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleOrmedFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {ormedFileStatus && (
                  <p className="text-[10px] text-teal-700 font-medium italic">{ormedFileStatus}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white hover:bg-teal-700 shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Salvar Alterações e Atualizar Agenda
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
