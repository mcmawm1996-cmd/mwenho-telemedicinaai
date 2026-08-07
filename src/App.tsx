/**
 * TelemedAI - Primary Application Orchestrator
 * 
 * Manages global user authentication context, role switching, real-time data sync,
 * and router orchestration between Patient, Doctor, Admin, and Video Consultation views.
 */

import React, { useState, useEffect } from "react";
import { User, UserRole, DoctorProfile, MedicalSpecialty, Appointment, Notification } from "./types.js";
import { safeJson } from "./utils.js";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import AdminDashboard from "./components/AdminDashboard";
import VideoConsultation from "./components/VideoConsultation";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  
  // Master clinical datasets
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeConsultation, setActiveConsultation] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync states from backend REST APIs
  const refreshAllData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const activeRole = simulatedRole || currentUser.role;
      const [specRes, docRes, aptRes, notRes] = await Promise.allSettled([
        fetch("/api/specialties"),
        fetch("/api/doctors?approvedOnly=false"),
        fetch(`/api/appointments?userId=${currentUser.id}&role=${activeRole}`),
        fetch(`/api/notifications/${currentUser.id}`)
      ]);

      if (specRes.status === "fulfilled" && specRes.value.ok) {
        const specs = await safeJson(specRes.value);
        if (Array.isArray(specs)) setSpecialties(specs);
      }
      if (docRes.status === "fulfilled" && docRes.value.ok) {
        const docs = await safeJson(docRes.value);
        if (Array.isArray(docs)) setDoctors(docs);
      }
      if (aptRes.status === "fulfilled" && aptRes.value.ok) {
        const apts = await safeJson(aptRes.value);
        if (Array.isArray(apts)) setAppointments(apts);
      }
      if (notRes.status === "fulfilled" && notRes.value.ok) {
        const nots = await safeJson(notRes.value);
        if (Array.isArray(nots)) setNotifications(nots);
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar dados do painel:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when user or role switches
  useEffect(() => {
    if (currentUser) {
      refreshAllData();
      
      // Setup periodic updates (e.g. notifications polling)
      const poll = setInterval(() => {
        refreshAllData();
      }, 8000);
      return () => clearInterval(poll);
    }
  }, [currentUser, simulatedRole]);

  // Auth handler
  const handleLoginSuccess = (user: User) => {
    // Explicitly reset any previous user session or role state
    setCurrentUser(null);
    setSimulatedRole(null);
    setAppointments([]);
    setNotifications([]);
    setActiveConsultation(null);

    // Set new authenticated user and role matching credentials
    const authenticRole = user.role;
    setCurrentUser(user);
    setSimulatedRole(authenticRole);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSimulatedRole(null);
    setAppointments([]);
    setNotifications([]);
    setActiveConsultation(null);
  };

  // Quick testing role switch
  const handleSwitchRole = (role: UserRole) => {
    setSimulatedRole(role);
  };

  // Appointment operations
  const handleBookAppointment = async (doctorId: string, date: string, time: string, aiReportId?: string) => {
    if (!currentUser) return null;
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          doctorId,
          date,
          time,
          aiReportId
        })
      });
      if (response.ok) {
        const apt = await safeJson(response);
        refreshAllData();
        return apt;
      }
      return null;
    } catch (err) {
      console.error("Error booking appointment", err);
      return null;
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", paymentStatus: "REFUNDED" })
      });
      if (response.ok) {
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" })
      });
      if (response.ok) {
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" })
      });
      if (response.ok) {
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/${currentUser.id}/read`, {
        method: "PUT"
      });
      // local clear
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Switch to active video call room
  const handleJoinVideoCall = (apt: Appointment) => {
    setActiveConsultation(apt);
  };

  const handleHangUpVideoCall = () => {
    setActiveConsultation(null);
    refreshAllData();
  };

  // Render correct dashboard depending strictly on user authenticated role
  const renderDashboard = () => {
    const activeRole = simulatedRole || currentUser?.role;

    switch (activeRole) {
      case UserRole.PATIENT:
        return (
          <PatientDashboard
            currentUser={currentUser!}
            doctors={doctors}
            specialties={specialties}
            appointments={appointments}
            notificationsCount={notifications.filter(n => !n.read).length}
            onBookAppointment={handleBookAppointment}
            onCancelAppointment={handleCancelAppointment}
            onJoinVideoCall={handleJoinVideoCall}
            onRefreshData={refreshAllData}
          />
        );
      case UserRole.DOCTOR:
        return (
          <DoctorDashboard
            currentUser={currentUser!}
            appointments={appointments}
            onAcceptAppointment={handleAcceptAppointment}
            onRejectAppointment={handleRejectAppointment}
            onJoinVideoCall={handleJoinVideoCall}
            onRefreshData={refreshAllData}
          />
        );
      case UserRole.ADMIN:
      case UserRole.GESTOR:
        return (
          <AdminDashboard
            currentUser={currentUser!}
            onRefreshData={refreshAllData}
          />
        );
      default:
        return (
          <div className="py-24 text-center text-xs text-slate-400">
            Perfil indefinido ou inválido.
          </div>
        );
    }
  };

  // Load initial specialties list for registration screen
  useEffect(() => {
    fetch("/api/specialties")
      .then(res => safeJson(res))
      .then(data => { if (Array.isArray(data)) setSpecialties(data); })
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* 1. Immersive Full-screen live video consult room */}
      {activeConsultation && (
        <VideoConsultation
          appointment={activeConsultation}
          onHangUp={handleHangUpVideoCall}
          userRole={(simulatedRole || currentUser?.role)!}
        />
      )}

      {/* 2. Standard Header navigation */}
      <Header
        currentUser={currentUser}
        simulatedRole={simulatedRole}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onRefreshData={refreshAllData}
      />

      {/* 3. Primary layout screen */}
      <main className="flex-1">
        {currentUser ? (
          renderDashboard()
        ) : (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            specialties={specialties}
          />
        )}
      </main>

      {/* 4. Humble professional footer */}
      <footer className="border-t border-slate-100 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-[10px] font-medium text-slate-400 sm:px-6 lg:px-8">
          TelemedAI © 2026 • Prontuário Eletrônico Certificado • Triagem Homologada • Conforme a Lei de Proteção de Dados de Angola (APD - Lei n.º 22/11)
        </div>
      </footer>
    </div>
  );
}
