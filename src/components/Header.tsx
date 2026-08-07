import React, { useState, useEffect, useRef } from "react";
import { User, UserRole, Notification } from "../types.js";
import { Activity, Bell, LogOut, Shield, Users, Stethoscope, RefreshCw, Check, AlertCircle, Camera } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  currentUser: User | null;
  simulatedRole?: UserRole | null;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => void;
  notifications: Notification[];
  onMarkNotificationsRead: () => void;
  onRefreshData: () => void;
}

export default function Header({ 
  currentUser, 
  simulatedRole,
  onLogout, 
  onSwitchRole, 
  notifications, 
  onMarkNotificationsRead,
  onRefreshData
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const activeRole = simulatedRole || currentUser?.role;

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecione um ficheiro de imagem válido.");
      return;
    }

    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Url = evt.target?.result as string;
      if (!base64Url) return;

      try {
        const res = await fetch(`/api/users/${currentUser.id}/avatar`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: base64Url })
        });
        if (res.ok) {
          currentUser.avatarUrl = base64Url;
          onRefreshData();
        } else {
          alert("Não foi possível atualizar a foto de perfil.");
        }
      } catch (err) {
        console.error("Erro ao atualizar foto de perfil:", err);
        alert("Erro de conexão ao carregar a foto de perfil.");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-100">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <span className="font-sans font-bold text-lg tracking-tight text-slate-800">
              Mwenho <span className="text-teal-600">TelemedAI</span>
            </span>
            <span className="ml-2 hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 sm:inline">
              Angola 🇦🇴
            </span>
          </div>
        </div>

        {/* Center: Strict Role Indicator Badge */}
        {currentUser && (
          <div className="hidden items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5 md:flex border border-slate-200/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Acesso Ativo:
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-0.5 text-xs font-bold text-teal-800 shadow-sm border border-slate-100">
              {activeRole === UserRole.PATIENT && (
                <>
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span>Área do Paciente</span>
                </>
              )}
              {activeRole === UserRole.DOCTOR && (
                <>
                  <Activity className="h-3.5 w-3.5 text-teal-600" />
                  <span>Consultório Médico</span>
                </>
              )}
              {(activeRole === UserRole.ADMIN || activeRole === UserRole.GESTOR) && (
                <>
                  <Shield className="h-3.5 w-3.5 text-teal-600" />
                  <span>Painel do Administrador</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Right side controls */}
        {currentUser ? (
          <div className="flex items-center gap-4">
            {/* Sync trigger */}
            <button
              id="refresh-server-data"
              onClick={onRefreshData}
              title="Sincronizar dados"
              className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
            </button>

            {/* Notifications panel toggle */}
            <div className="relative">
              <button
                id="notifications-toggle"
                onClick={handleNotificationClick}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Click outside overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-80 z-50 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-50 px-3 py-2">
                        <span className="text-xs font-bold text-slate-700">Notificações</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {unreadCount} novas
                          </span>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Nenhuma notificação encontrada.
                          </div>
                        ) : (
                          notifications.map((not, idx) => (
                            <div
                              key={`notif-${not.id}-${idx}`}
                              className={`flex gap-3 rounded-xl p-2.5 transition-colors ${
                                not.read ? "opacity-70" : "bg-teal-50/30"
                              }`}
                            >
                              <div className="mt-0.5">
                                {not.type === "success" ? (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-600">
                                    <Check className="h-3 w-3" />
                                  </div>
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                    <AlertCircle className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-xs font-semibold text-slate-800">{not.title}</h4>
                                <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">{not.message}</p>
                                <span className="mt-1 block text-[9px] text-slate-400">
                                  {new Date(not.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile & Logout */}
            <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Clique para alterar a sua foto de perfil"
                className="relative group rounded-xl overflow-hidden ring-2 ring-teal-100 hover:ring-teal-500 transition-all focus:outline-none"
              >
                <img
                  src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
                  alt={currentUser.name}
                  className="h-9 w-9 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-teal-600/80 flex items-center justify-center text-white text-[9px] font-bold">
                    ...
                  </div>
                )}
              </button>

              <div className="hidden flex-col sm:flex">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                  {activeRole === UserRole.PATIENT ? "Paciente" : activeRole === UserRole.DOCTOR ? "Médico" : "Administrador"}
                </span>
              </div>
              <button
                id="app-logout"
                onClick={onLogout}
                title="Sair"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Ambiente Seguro | APD (Lei n.º 22/11)</span>
          </div>
        )}
      </div>
    </header>
  );
}
