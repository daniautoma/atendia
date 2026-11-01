'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Modal } from '@/components/ui/Modal';
import {
  Blocks,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings2,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  Power,
  Shield,
  Layers,
  KeyRound,
  Lock,
} from 'lucide-react';

export default function IntegracionesPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGoogleConfig, setHasGoogleConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal de configuración individual
  const [activeIntegration, setActiveIntegration] = useState<any | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Formulario de credenciales / opciones
  const [configValues, setConfigValues] = useState<any>({});
  const [credentialValues, setCredentialValues] = useState<any>({});

  // Modal Guía Paso a Paso GCP
  const [isGcpGuideOpen, setIsGcpGuideOpen] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Estado prueba rápida Telegram
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<any | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations');
      const data = await res.json();
      if (data.integrations) {
        setIntegrations(data.integrations);
        setHasGoogleConfig(data.hasGoogleConfig);
      }
    } catch {
      setError('Error al cargar catálogo de integraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleOpenConfig = (intg: any) => {
    setActiveIntegration(intg);
    setConfigValues(intg.config || {});
    setCredentialValues({});
    setTestingTelegram(false);
    setTelegramTestResult(null);
    setIsConfigModalOpen(true);
  };

  const handleToggleEnable = async (intg: any) => {
    const nextState = !intg.enabled;

    // Si es Google OAuth y va a conectar pero no hay tokens
    if (nextState && intg.authType === 'OAUTH2' && (!intg.maskedCreds || Object.keys(intg.maskedCreds).length === 0)) {
      window.location.href = `/api/integrations/google/auth?service=${intg.id}`;
      return;
    }

    try {
      const res = await fetch(`/api/integrations/${intg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) fetchIntegrations();
    } catch {
      alert('Error al actualizar estado');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntegration) return;
    setSavingConfig(true);

    try {
      const body: any = {
        config: configValues,
      };

      // Si se introdujeron credenciales
      if (Object.keys(credentialValues).length > 0) {
        body.credentials = credentialValues;
        body.enabled = true; // Habilitar si se configuran credenciales
      }

      const res = await fetch(`/api/integrations/${activeIntegration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al guardar configuración');
      setIsConfigModalOpen(false);
      fetchIntegrations();
    } catch (err: any) {
      alert(err?.message || 'Error al guardar');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    if (!confirm('¿Seguro que deseas desconectar esta integración?')) return;
    try {
      const res = await fetch(`/api/integrations/${providerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsConfigModalOpen(false);
        fetchIntegrations();
      }
    } catch {
      alert('Error al desconectar');
    }
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const callbackUrl = `${appUrl}/api/integrations/google/callback`;

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  // Renderizador de logotipos SVG oficiales
  const renderLogo = (id: string) => {
    switch (id) {
      case 'google_calendar':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center p-2 border border-blue-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
              <path fill="#1967D2" d="M9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 4h-2v-2h2v2zm4 0h-2v-2h2v2z" />
            </svg>
          </div>
        );
      case 'gmail':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center p-2 border border-rose-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#EA4335" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </div>
        );
      case 'google_sheets':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center p-2 border border-emerald-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#0F9D58" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5 0h-3v-2h3v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
        );
      case 'slack':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center p-2 border border-purple-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#ECB22E" d="M5.04 15.13a2.02 2.02 0 1 1-2.02-2.02h2.02v2.02zm1.01 0a2.02 2.02 0 1 1 4.04 0v5.05a2.02 2.02 0 1 1-4.04 0v-5.05z" />
              <path fill="#36C5F0" d="M8.87 5.04a2.02 2.02 0 1 1 2.02-2.02v2.02H8.87zm0 1.01a2.02 2.02 0 1 1 0 4.04H3.82a2.02 2.02 0 1 1 0-4.04h5.05z" />
              <path fill="#2EB67D" d="M18.96 8.87a2.02 2.02 0 1 1 2.02 2.02h-2.02V8.87zm-1.01 0a2.02 2.02 0 1 1-4.04 0V3.82a2.02 2.02 0 1 1 4.04 0v5.05z" />
              <path fill="#E01E5A" d="M15.13 18.96a2.02 2.02 0 1 1-2.02 2.02v-2.02h2.02zm0-1.01a2.02 2.02 0 1 1 0-4.04h5.05a2.02 2.02 0 1 1 0 4.04h-5.05z" />
            </svg>
          </div>
        );
      case 'stripe':
        return (
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center p-2 border border-indigo-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.521.5 5.776.5 2.032 4.148 2.032 9.07c0 5.485 5.093 6.945 8.167 8.087 2.456.913 3.328 1.602 3.328 2.627 0 .984-.872 1.545-2.327 1.545-2.677 0-5.59-1.258-7.533-2.316l-.916 5.612c2.15 1.159 5.378 1.875 8.45 1.875 7.152 0 10.976-3.486 10.976-8.795 0-5.613-5.068-7.05-8.201-8.155z" />
            </svg>
          </div>
        );
      case 'webhooks':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center p-2 border border-amber-100">
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#D97706" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
        );
      default:
        return <Blocks className="w-6 h-6 text-stone-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      <Header
        title="Catálogo de Integraciones"
        subtitle="Conecta los servicios de tu clínica para dotar a DentalIA de herramientas de acción reales"
        actions={
          <button
            onClick={() => setIsGcpGuideOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            <span>Guía paso a paso Google Cloud (GCP)</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-6xl">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Notificación de Google OAuth si faltan credenciales en .env */}
        {!hasGoogleConfig && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Configuración previa de Google OAuth</h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Para conectar Calendar, Gmail o Sheets con un solo clic, configura <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> en tu archivo <code>.env</code>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsGcpGuideOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-900 text-xs font-semibold shrink-0 cursor-pointer"
            >
              Ver guía GCP
            </button>
          </div>
        )}

        {/* Cuadrícula de Tarjetas de Integración */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((intg) => (
            <div
              key={intg.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white shadow-2xs hover:shadow-xs ${
                intg.enabled ? 'border-teal-500/40 ring-1 ring-teal-500/10' : 'border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  {renderLogo(intg.id)}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        intg.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {intg.enabled ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-stone-900">{intg.name}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-3">
                    {intg.description}
                  </p>
                </div>

                {/* Resumen de permisos activados */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span>{intg.capabilities?.length || 0} capacidades</span>
                  {intg.maskedCreds && Object.keys(intg.maskedCreds).length > 0 && (
                    <span className="flex items-center gap-1 text-stone-500 font-mono text-[10px]">
                      <Lock className="w-2.5 h-2.5" />
                      Cifrado AES-256
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center gap-2">
                <button
                  onClick={() => handleOpenConfig(intg)}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Configurar</span>
                </button>

                <button
                  onClick={() => handleToggleEnable(intg)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    intg.enabled
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {intg.enabled ? 'Desconectar' : 'Conectar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Configuración Individual de Integración */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configurar ${activeIntegration?.name || 'Integración'}`}
        description="Ajusta las credenciales cifradas y define qué acciones tiene permitido realizar el asistente"
        maxWidth="lg"
      >
        {activeIntegration && (
          <form onSubmit={handleSaveConfig} className="space-y-5">
            {/* 1. Campos específicos de autenticación */}
            {activeIntegration.authType === 'WEBHOOK_URL' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Incoming Webhook URL de Slack
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={credentialValues.webhookUrl || ''}
                  onChange={(e) =>
                    setCredentialValues({ ...credentialValues, webhookUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
                {activeIntegration.maskedCreds?.webhookUrl && (
                  <p className="text-[11px] text-stone-400 mt-1 font-mono">
                    Valor actual guardado: {activeIntegration.maskedCreds.webhookUrl}
                  </p>
                )}
              </div>
            )}

            {activeIntegration.authType === 'API_KEY' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Clave Restringida de Stripe (Restricted API Key)
                </label>
                <input
                  type="password"
                  placeholder="rk_live_... o rk_test_..."
                  value={credentialValues.restrictedKey || ''}
                  onChange={(e) =>
                    setCredentialValues({ ...credentialValues, restrictedKey: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                />
                {activeIntegration.maskedCreds?.restrictedKey && (
                  <p className="text-[11px] text-stone-400 mt-1 font-mono">
                    Clave guardada: {activeIntegration.maskedCreds.restrictedKey}
                  </p>
                )}
              </div>
            )}

            {activeIntegration.authType === 'CUSTOM' && activeIntegration.id === 'webhooks' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    URL de Destino (Endpoint HTTP POST)
                  </label>
                  <input
                    type="url"
                    placeholder="https://tu-crm.com/api/webhooks/atendia"
                    value={credentialValues.endpointUrl || ''}
                    onChange={(e) =>
                      setCredentialValues({ ...credentialValues, endpointUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                  />
                  {activeIntegration.maskedCreds?.endpointUrl && (
                    <p className="text-[11px] text-stone-400 mt-1 font-mono">
                      Endpoint actual: {activeIntegration.maskedCreds.endpointUrl}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Secreto de Firma HMAC-SHA256 (Secret)
                  </label>
                  <input
                    type="password"
                    placeholder="whsec_..."
                    value={credentialValues.secret || ''}
                    onChange={(e) =>
                      setCredentialValues({ ...credentialValues, secret: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {activeIntegration.id === 'telegram' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Token del Bot de Telegram (Bot Token)
                  </label>
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={credentialValues.botToken || ''}
                    onChange={(e) =>
                      setCredentialValues({ ...credentialValues, botToken: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                  />
                  {activeIntegration.maskedCreds?.botToken && (
                    <p className="text-[11px] text-stone-400 mt-1 font-mono">
                      Token guardado: {activeIntegration.maskedCreds.botToken}
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Token obtenido vía @BotFather al crear tu bot (ej. CrmAtendiaBot).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Chat ID del Administrador
                  </label>
                  <input
                    type="text"
                    placeholder="87847949"
                    value={credentialValues.chatId || ''}
                    onChange={(e) =>
                      setCredentialValues({ ...credentialValues, chatId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono"
                  />
                  {activeIntegration.maskedCreds?.chatId && (
                    <p className="text-[11px] text-stone-400 mt-1 font-mono">
                      Chat ID guardado: {activeIntegration.maskedCreds.chatId}
                    </p>
                  )}
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Tu ID numérico de chat personal (ej. 87847949) o ID de grupo.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setTestingTelegram(true);
                      setTelegramTestResult(null);
                      try {
                        const res = await fetch('/api/integrations/telegram/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            botToken: credentialValues.botToken,
                            chatId: credentialValues.chatId,
                          }),
                        });
                        const data = await res.json();
                        setTelegramTestResult(data);
                      } catch (err: any) {
                        setTelegramTestResult({ ok: false, message: err.message });
                      } finally {
                        setTestingTelegram(false);
                      }
                    }}
                    disabled={testingTelegram}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors disabled:opacity-50"
                  >
                    <span>{testingTelegram ? 'Enviando prueba...' : '⚡ Probar Conexión con Telegram'}</span>
                  </button>

                  {telegramTestResult && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                        telegramTestResult.ok
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span className="font-bold">{telegramTestResult.ok ? '✓' : '✕'}</span>
                      <span>{telegramTestResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeIntegration.authType === 'OAUTH2' && (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <p className="font-semibold text-stone-800">Autorización OAuth 2.0 con Google</p>
                <p className="text-stone-600 leading-relaxed">
                  Esta integración utiliza la API oficial de Google con refresco automático de tokens (`offline access`).
                </p>
                <div className="pt-2">
                  <a
                    href={`/api/integrations/google/auth?service=${activeIntegration.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition-colors"
                  >
                    <span>{activeIntegration.enabled ? 'Reautorizar con Google' : 'Conectar con Google'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* 2. Checkboxes de Capacidades del Asistente */}
            <div className="pt-3 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-900 mb-2.5">
                Capacidades permitidas para el Asistente:
              </h4>
              <div className="space-y-2">
                {activeIntegration.capabilities?.map((cap: any) => {
                  const isChecked = configValues[cap.key] !== undefined ? !!configValues[cap.key] : cap.default;
                  return (
                    <label
                      key={cap.key}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-100 hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setConfigValues({ ...configValues, [cap.key]: e.target.checked })
                        }
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-semibold text-stone-800">{cap.label}</p>
                        <p className="text-[11px] text-stone-500">{cap.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              {activeIntegration.enabled ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(activeIntegration.id)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Desconectar y borrar credenciales
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-200 text-stone-700 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Guía Paso a Paso GCP */}
      <Modal
        isOpen={isGcpGuideOpen}
        onClose={() => setIsGcpGuideOpen(false)}
        title="Guía Paso a Paso: Configurar Google Cloud (GCP)"
        description="Configuración de un único cliente OAuth en Google Cloud para Calendar, Gmail y Sheets"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs text-stone-700 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900">
            <p className="font-semibold">Arquitectura de Cliente Único con Autorización Incremental</p>
            <p className="mt-1 text-blue-800">
              Solo necesitas un <b>Client ID</b> y un <b>Client Secret</b> en Google Cloud Console. Cuando el usuario conecta Calendar, solo se pide permiso para Calendar; si luego conecta Sheets, Google añade el nuevo permiso sin perder el anterior.
            </p>
          </div>

          <ol className="list-decimal pl-5 space-y-3 font-normal">
            <li>
              <b>Crea un Proyecto en Google Cloud Console:</b>
              <p className="text-stone-500 mt-0.5">
                Accede a <a href="https://console.cloud.google.com" target="_blank" className="text-teal-700 underline font-semibold">console.cloud.google.com</a> y crea un nuevo proyecto llamado <code>Atendia - Clínica Dental San Salvador</code>.
              </p>
            </li>

            <li>
              <b>Habilita las APIs necesarias:</b>
              <p className="text-stone-500 mt-0.5">
                En el menú lateral ve a <i>APIs y Servicios &gt; Biblioteca</i> y habilita:
              </p>
              <ul className="list-disc pl-5 mt-1 text-stone-600 space-y-0.5">
                <li><code>Google Calendar API</code></li>
                <li><code>Gmail API</code></li>
                <li><code>Google Sheets API</code> y <code>Google Drive API</code></li>
              </ul>
            </li>

            <li>
              <b>Configura la Pantalla de Consentimiento OAuth:</b>
              <p className="text-stone-500 mt-0.5">
                Ve a <i>APIs y Servicios &gt; Pantalla de consentimiento</i>. Selecciona tipo de usuario <b>Externo</b> (o Interno si tienes Google Workspace empresarial), pon nombre "Atendia" y tu correo de soporte.
              </p>
            </li>

            <li>
              <b>Crea las Credenciales de OAuth 2.0:</b>
              <p className="text-stone-500 mt-0.5">
                En <i>Credenciales &gt; Crear credenciales &gt; ID de cliente de OAuth</i>:
              </p>
              <ul className="list-disc pl-5 mt-1 text-stone-600 space-y-0.5">
                <li>Tipo de aplicación: <b>Aplicación web</b></li>
                <li>Nombre: <code>Atendia Web App</code></li>
                <li>
                  <b>URI de redirección autorizados:</b>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="p-1.5 bg-stone-100 rounded border border-stone-200 text-stone-900 font-mono text-[11px] select-all">
                      {callbackUrl}
                    </code>
                    <button
                      onClick={copyCallbackUrl}
                      className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded text-stone-800 text-[10px] font-semibold cursor-pointer shrink-0"
                    >
                      {copiedCallback ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </li>
              </ul>
            </li>

            <li>
              <b>Añade las variables a tu archivo .env:</b>
              <pre className="p-2.5 bg-stone-900 text-stone-100 rounded-lg text-[11px] font-mono mt-1">
{`GOOGLE_CLIENT_ID="tu-cliente-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-cliente-secreto"`}
              </pre>
            </li>
          </ol>

          <div className="pt-3 border-t border-stone-100 flex justify-end">
            <button
              onClick={() => setIsGcpGuideOpen(false)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-xs hover:bg-teal-700"
            >
              Entendido, cerrar guía
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
