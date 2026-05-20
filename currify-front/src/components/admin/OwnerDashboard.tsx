import React, { useState, useEffect } from 'react';
import Layout from '../layout/Layout';
import Unauthorized from '../common/Unauthorized';
import { apiService } from '../../services/api';

interface OwnerSummary {
  totalUsers: number;
  totalCompanies: number;
  totalCampaigns: number;
  totalCandidates: number;
}

interface OwnerLlmStats {
  totals: {
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  }>;
  byAction: Array<{
    action: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  }>;
  recentLogs: Array<{
    id: string;
    userId: string | null;
    companyId: string | null;
    action: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    timestamp: string;
    userEmail: string | null;
    company: string | null;
  }>;
}

interface OwnerUser {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: string;
  isActive: boolean;
  plan: string;
  cvCredits: number;
  smartFillCredits: number;
  campaignLimit: number;
  createdAt: string;
  updatedAt: string;
}

const OwnerDashboard: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [llmStats, setLlmStats] = useState<OwnerLlmStats | null>(null);
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'llm'>('overview');
  const [editingUser, setEditingUser] = useState<OwnerUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for editing user plan/credits
  const [formData, setFormData] = useState({
    plan: 'FREE',
    cvCredits: 3,
    smartFillCredits: 3,
    campaignLimit: 1,
    isActive: true,
  });

  useEffect(() => {
    checkPermissionsAndLoad();
  }, []);

  const checkPermissionsAndLoad = async () => {
    try {
      setLoading(true);
      const profile = await apiService.getProfile();
      setUserRole(profile.role);

      if (profile.role === 'OWNER') {
        await Promise.all([
          loadSummary(),
          loadLlmStats(),
          loadUsers(),
        ]);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Error checking permissions or loading data:', err);
      setError(err.message || 'Error al inicializar el panel de propietario');
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    const data = await apiService.getOwnerDashboardSummary();
    setSummary(data);
  };

  const loadLlmStats = async () => {
    const data = await apiService.getOwnerLlmStats();
    setLlmStats(data);
  };

  const loadUsers = async () => {
    const data = await apiService.getOwnerUsers();
    setUsers(data);
  };

  const handleOpenEditModal = (user: OwnerUser) => {
    setEditingUser(user);
    setFormData({
      plan: user.plan,
      cvCredits: user.cvCredits,
      smartFillCredits: user.smartFillCredits,
      campaignLimit: user.campaignLimit,
      isActive: user.isActive,
    });
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'number') {
      finalValue = parseInt(value, 10) || 0;
    } else if (value === 'true') {
      finalValue = true;
    } else if (value === 'false') {
      finalValue = false;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccess(null);

    try {
      await apiService.updateOwnerUserPlan(editingUser.id, formData);
      setSuccess(`Usuario ${editingUser.email} actualizado exitosamente.`);
      setShowEditModal(false);
      // Reload everything
      await Promise.all([
        loadSummary(),
        loadLlmStats(),
        loadUsers(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar usuario');
    }
  };

  // If not OWNER, show unauthorized view
  if (!loading && userRole !== 'OWNER') {
    return <Unauthorized />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-solid"></div>
          <p className="mt-4 text-slate-500 font-medium">Cargando Panel de Owner...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Background aesthetics */}
      <div className="relative min-h-screen bg-slate-900 text-white font-sans overflow-x-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Owner Portal
                </span>
                <span className="text-slate-500 text-sm">System Administrator</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Consola de Administración
              </h1>
            </div>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-5 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-800 text-sm font-medium transition-all shadow-md flex items-center gap-2"
            >
              <span>← Volver al Dashboard</span>
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-6 bg-red-950/60 border border-red-800 text-red-300 px-4 py-3.5 rounded-xl flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-3.5 rounded-xl flex items-start gap-3 animate-fade-in">
              <span className="text-xl">✨</span>
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
              <p className="text-xs text-slate-400 uppercase font-black tracking-wider mb-1">Usuarios Totales</p>
              <h3 className="text-3xl font-extrabold text-white">{summary?.totalUsers ?? 0}</h3>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[70%]"></div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
              <p className="text-xs text-slate-400 uppercase font-black tracking-wider mb-1">Empresas Activas</p>
              <h3 className="text-3xl font-extrabold text-emerald-400">{summary?.totalCompanies ?? 0}</h3>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full w-[60%]"></div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
              <p className="text-xs text-slate-400 uppercase font-black tracking-wider mb-1">Campañas Creadas</p>
              <h3 className="text-3xl font-extrabold text-purple-400">{summary?.totalCampaigns ?? 0}</h3>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-[50%]"></div>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
              <p className="text-xs text-slate-400 uppercase font-black tracking-wider mb-1">Candidatos Evaluados</p>
              <h3 className="text-3xl font-extrabold text-amber-400">{summary?.totalCandidates ?? 0}</h3>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full w-[80%]"></div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 mb-8 overflow-x-auto gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-2 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Visión General
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-2 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Usuarios y Licencias ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('llm')}
              className={`pb-4 px-2 text-sm font-bold tracking-wide transition-all border-b-2 whitespace-nowrap ${activeTab === 'llm' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Consumo de LLM
            </button>
          </div>

          {/* Tab Content: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost Summary card */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>💵</span> Resumen de Costos LLM
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Costo Acumulado Estimado</p>
                        <p className="text-3xl font-black text-white">${llmStats?.totals.cost.toFixed(4) ?? '0.0000'}</p>
                      </div>
                      <span className="text-3xl">🚀</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <p className="text-[10px] text-slate-400 uppercase font-black">Tokens Totales</p>
                        <p className="text-lg font-bold text-indigo-400">
                          {llmStats?.totals.totalTokens.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <p className="text-[10px] text-slate-400 uppercase font-black">Total Peticiones</p>
                        <p className="text-lg font-bold text-emerald-400">
                          {llmStats?.totals.totalRequests ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick actions card */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                      <span>⚡</span> Acciones Rápidas
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Gestiona los accesos globales del sistema, asignación de créditos SaaS y monitorea la salud del procesador de currículums.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('users')}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-md text-center"
                    >
                      Asignar Créditos
                    </button>
                    <button
                      onClick={() => setActiveTab('llm')}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs border border-slate-700 transition-colors shadow-md text-center"
                    >
                      Auditar Logs LLM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: USERS */}
          {activeTab === 'users' && (
            <div className="bg-slate-800/20 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-md animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold">Listado de Usuarios</h3>
                  <p className="text-slate-400 text-xs">Otorga planes, habilita cuentas y actualiza créditos</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase font-black">
                      <th className="py-3.5 px-4">Usuario</th>
                      <th className="py-3.5 px-4">Empresa</th>
                      <th className="py-3.5 px-4">Plan / Rol</th>
                      <th className="py-3.5 px-4 text-center">Créditos CV</th>
                      <th className="py-3.5 px-4 text-center">Créditos Fill</th>
                      <th className="py-3.5 px-4 text-center">Límite Camp.</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {users.map((u) => {
                      const isUserOwner = u.role === 'OWNER';
                      const planColors: Record<string, string> = {
                        FREE: 'bg-slate-700 text-slate-200 border-slate-600',
                        PRO: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-300 border-yellow-700/50',
                        ENTERPRISE: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-indigo-300 border-indigo-700/50',
                      };
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-300">{u.company || '—'}</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${planColors[u.plan] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                                {u.plan}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{u.role}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-indigo-300">{u.cvCredits}</td>
                          <td className="py-4 px-4 text-center font-bold text-purple-300">{u.smartFillCredits}</td>
                          <td className="py-4 px-4 text-center font-bold text-slate-300">{u.campaignLimit}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                              <span className={`h-2.5 w-2.5 rounded-full ${u.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {!isUserOwner && (
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-bold transition-all text-indigo-400"
                              >
                                Editar Licencia
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: LLM CONSUMPTION */}
          {activeTab === 'llm' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost by model */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="text-lg font-bold mb-4">Consumo por Modelo</h3>
                  <div className="space-y-4">
                    {llmStats?.byModel.map((bm) => {
                      const maxCost = Math.max(...(llmStats?.byModel.map(o => o.cost) || [1]));
                      const percent = Math.min(100, (bm.cost / (maxCost || 1)) * 100);
                      return (
                        <div key={bm.model}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-200">{bm.model}</span>
                            <span className="text-slate-400">${bm.cost.toFixed(4)} ({bm.requests} reqs)</span>
                          </div>
                          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {(!llmStats || llmStats.byModel.length === 0) && (
                      <p className="text-slate-500 text-xs">No hay datos registrados aún.</p>
                    )}
                  </div>
                </div>

                {/* Cost by action */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
                  <h3 className="text-lg font-bold mb-4">Consumo por Acción</h3>
                  <div className="space-y-4">
                    {llmStats?.byAction.map((ba) => {
                      const maxCost = Math.max(...(llmStats?.byAction.map(o => o.cost) || [1]));
                      const percent = Math.min(100, (ba.cost / (maxCost || 1)) * 100);
                      return (
                        <div key={ba.action}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-200">{ba.action}</span>
                            <span className="text-slate-400">${ba.cost.toFixed(4)} ({ba.requests} reqs)</span>
                          </div>
                          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                    {(!llmStats || llmStats.byAction.length === 0) && (
                      <p className="text-slate-500 text-xs">No hay datos registrados aún.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Logs Table */}
              <div className="bg-slate-800/20 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-xl font-bold mb-4">Historial Reciente de Peticiones</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-left">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase font-black">
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Empresa</th>
                        <th className="py-3 px-4">Acción</th>
                        <th className="py-3 px-4">Modelo</th>
                        <th className="py-3 px-4 text-center">Tokens</th>
                        <th className="py-3 px-4 text-right">Costo Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {llmStats?.recentLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-800/10">
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(l.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-200">
                            {l.userEmail || 'Sistema (Background)'}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {l.company || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-800 rounded font-semibold border border-slate-700 text-slate-300">
                              {l.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{l.model}</td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-300">
                            {l.totalTokens.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400">
                            ${l.cost.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                      {(!llmStats || llmStats.recentLogs.length === 0) && (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-500 font-medium">
                            No hay logs registrados aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EDIT MODAL */}
          {showEditModal && editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white">Editar Licencia y Límites</h3>
                    <p className="text-xs text-slate-400">{editingUser.email}</p>
                  </div>
                  <button
                    onClick={handleCloseEditModal}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                  {/* Active plan selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Plan de Suscripción
                    </label>
                    <select
                      name="plan"
                      value={formData.plan}
                      onChange={handleFormChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>

                  {/* Credits inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Créditos CV
                      </label>
                      <input
                        type="number"
                        name="cvCredits"
                        value={formData.cvCredits}
                        onChange={handleFormChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Créditos Smart Fill
                      </label>
                      <input
                        type="number"
                        name="smartFillCredits"
                        value={formData.smartFillCredits}
                        onChange={handleFormChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Campaign Limit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Límite de Campañas Activas
                    </label>
                    <input
                      type="number"
                      name="campaignLimit"
                      value={formData.campaignLimit}
                      onChange={handleFormChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Active / Blocked */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Estado de la Cuenta
                    </label>
                    <select
                      name="isActive"
                      value={String(formData.isActive)}
                      onChange={handleFormChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="true">Activa</option>
                      <option value="false">Inactiva (Bloqueada)</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-semibold hover:bg-slate-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white text-sm font-semibold shadow-md transition-colors"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
};

export default OwnerDashboard;
