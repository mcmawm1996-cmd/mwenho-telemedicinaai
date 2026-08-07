/**
 * TelemedAI - System Core Type Definitions
 * 
 * Provides unified TypeScript interfaces, enums, and data schemas for:
 * - User Authentication & Role-Based Access Control (RBAC)
 * - Clinical Consultations, Schedules & Triage Reports
 * - Medical Prescriptions, Vital Signs & Health Metrics
 * - Subscription Plans and Payment Integrations
 */

export enum UserRole {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  ADMIN = "ADMIN",
  GESTOR = "GESTOR"
}

export type AngolanPaymentMethod = "MCX" | "KWIK" | "UNITEL_MONEY" | "EKWANZA" | "PAYPAY";

export interface SubscriptionPlan {
  id: "FREE_TRIAL" | "MONTHLY" | "TRIMESTRAL" | "ANNUAL";
  name: string;
  priceKz: number;
  periodLabel: string;
  trialDays?: number;
  description: string;
  features: string[];
}

export interface UserSubscription {
  planId: "FREE_TRIAL" | "MONTHLY" | "TRIMESTRAL" | "ANNUAL";
  planName: string;
  isTrial: boolean;
  trialDaysLeft: number;
  active: boolean;
  expiryDate: string;
  paymentMethod?: AngolanPaymentMethod;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  authProvider?: "email" | "google" | "phone";
  password?: string;
  avatarUrl?: string;
  createdAt: string;
  isAnonymous?: boolean;
  subscription?: UserSubscription;
}

export interface MedicalSpecialty {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface DoctorProfile {
  id: string; // matches user.id
  name: string;
  email?: string;
  specialtyId: string;
  specialtyName: string;
  licenseNumber: string;
  bio: string;
  rating: number;
  consultationFee: number;
  avatarUrl: string;
  availableDays: string[]; // e.g. ["Seg", "Ter", "Qua", "Qui", "Sex"]
  availableSlots: string[]; // e.g. ["09:00", "10:30", "14:00", "16:00"]
  approved: boolean;
  ormedDocumentUrl?: string;
  ormedDocumentName?: string;
}

export interface PatientProfile {
  id: string; // matches user.id
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  insuranceProvider?: string;
}

export interface AIReport {
  id: string;
  patientId: string;
  patientName: string;
  symptoms: string;
  severity: "Baixo" | "Moderado" | "Alto" | "Urgente";
  suggestedSpecialty: string;
  clinicalSummary: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorName: string;
  date: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string }[];
  instructions: string;
  digitalSignature: string;
}

export enum AppointmentStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  consultationFee: number;
  paymentStatus: "PENDING" | "PAID" | "REFUNDED";
  videoRoomId: string;
  aiReportId?: string;
  prescription?: Prescription;
  doctorNotes?: string;
}

export interface Message {
  id: string;
  chatId: string; // e.g. "patientId-doctorId" or "patientId-ai"
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAi?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface PlatformManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleTitle: "Gestor Financeiro" | "Gestor de Médicos" | "Gestor de Pacientes" | "Gestor de Triagem / Suporte" | "Administrador Geral";
  department: string;
  avatarUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface LoginLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  loginMethod: string;
  timestamp: string;
  ipOrDevice?: string;
}

export interface ClinicalExam {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  laboratory: string;
  examDate: string;
  fileUrl?: string;
  fileName?: string;
  aiAnalysisSummary?: string;
  keyFindings?: string[];
  status: "Pendente Análise" | "Analisado por IA" | "Validado por Médico";
  uploadedAt: string;
}

export interface AudioMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  audioUrl: string;
  durationSeconds: number;
  timestamp: string;
}

export interface SystemStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  totalRevenue: number;
  appointmentsByStatus: { status: string; count: number }[];
  appointmentsBySpecialty: { specialty: string; count: number }[];
  revenueByMonth: { month: string; amount: number }[];
  severityStats: { severity: string; count: number }[];
}
