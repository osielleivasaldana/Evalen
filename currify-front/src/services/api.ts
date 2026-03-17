import axios from 'axios';

const getBaseUrl = (port: number) => {
  const hostname = window.location.hostname;
  return `http://${hostname}:${port}`;
};

const getApiUrl = (envUrl: string | undefined, port: number) => {
  const currentHostname = window.location.hostname;
  const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

  // If we are NOT on localhost (e.g. mobile), force dynamic IP to avoid connecting to localhost on the phone
  if (!isLocalhost) {
    return getBaseUrl(port);
  }

  // Otherwise (we are on localhost), use env var if present, or fallback to dynamic
  return envUrl || getBaseUrl(port);
};

const API_BASE_URL = getApiUrl(process.env.REACT_APP_API_URL, 3001);
const CV_PROCESSING_URL = getApiUrl(process.env.REACT_APP_SCORING_SERVICE_URL, 8001);

// Auth interfaces
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user?: UserProfile;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  plan?: string;
  cvCredits?: number;
  campaignLimit?: number;
  activeCampaignsCount?: number;
}

// User Management interfaces
interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  company?: string;
  role: string;
}

interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  company?: string;
  role?: string;
  companySize?: string;
  hiringVolume?: string;
  atsSystem?: string;
  onboardingCompleted?: boolean;
}

// New enums and types
export type CandidateStatus = 'NEW' | 'IN_PROCESS' | 'NOT_SELECTED' | 'SELECTED';
export type StageStatus = 'PENDING' | 'ACTIVE' | 'ACCEPTED' | 'REJECTED';
export type UserRole = 'ADMIN' | 'RECRUITER' | 'TECHNICAL_REVIEWER';

// Stage Template interfaces
export interface StageTemplate {
  id: string;
  name: string;
  description?: string;
  order: number;
  responsibleId: string;
  responsible?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface StageTemplateInput {
  name: string;
  description?: string;
  responsibleId: string;
  order: number;
}

// Campaign interfaces
interface Campaign {
  id: string;
  title: string;
  description: string;
  requirements: string;
  conditions: string;
  location?: string;
  workType?: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP';
  modality?: 'REMOTE' | 'HYBRID' | 'ON_SITE';
  duration?: 'INDEFINITE' | 'FIXED_TERM' | 'PROJECT';
  inclusionPosition?: boolean;
  salary?: number;
  currency?: 'CLP' | 'USD' | 'EUR' | 'UF';
  showSalary?: boolean;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  publicId: string;
  createdAt: string;
  updatedAt: string;
  stageTemplates?: StageTemplate[];
  _count?: {
    candidates: number;
  };
  isLimitReached?: boolean;
}

interface CreateCampaignRequest {
  title: string;
  description: string;
  requirements?: string;
  conditions?: string;
  location?: string;
  workType?: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP';
  modality?: 'REMOTE' | 'HYBRID' | 'ON_SITE';
  duration?: 'INDEFINITE' | 'FIXED_TERM' | 'PROJECT';
  inclusionPosition?: boolean;
  salary?: number;
  currency?: 'CLP' | 'USD' | 'EUR' | 'UF';
  showSalary?: boolean;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  stageTemplates?: StageTemplateInput[];
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalCandidates: number;
  recentApplications: number;
}

// Document and CV interfaces
interface UploadDocumentRequest {
  file: File;
  campaignPublicId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
}

interface CVData {
  datos_cv: {
    datos_contacto: {
      nombre_completo: string;
      telefono: string;
      email: string;
      ubicacion: string;
      metadata: any;
    };
    titular_profesional: {
      titular: string;
      metadata: any;
    };
    resumen_profesional: {
      resumen: string;
      metadata: any;
    };
    experiencia_laboral: Array<{
      cargo: string;
      empresa: string;
      periodo: {
        fecha_inicio: string;
        fecha_fin: string;
        texto_original: string;
        metadata: any;
      };
      responsabilidades: string[];
      ubicacion: string | null;
      metadata: any;
    }>;
    formacion_academica: Array<{
      titulo: string;
      institucion: string;
      periodo: {
        fecha_inicio: string | null;
        fecha_fin: string | null;
        texto_original: string;
        metadata: any;
      };
      gpa: string | null;
      ubicacion: string | null;
      metadata: any;
    }>;
    habilidades: {
      habilidades_tecnicas: Array<{
        skill: string;
        level: string;
        years_experience: number | null;
        metadata: any;
      }>;
      idiomas: Array<{
        idioma: string;
        nivel: string;
        certificacion: string;
        metadata: any;
      }>;
      habilidades_blandas: any[];
      metadata: any;
    };
    perfiles_online: any;
    formacion_complementaria: {
      certificaciones_cursos: string[];
      metadata: any;
    };
    reconocimientos: {
      logros_premios: any[];
      metadata: any;
    };
    actividades_extracurriculares: any;
    intereses: any;
    metadata_procesamiento: any;
  };
  confianza_general: number;
  advertencias: any[];
  campos_faltantes: any[];
  tiempo_procesamiento: number;
  timestamp: string;
}

// Candidate interfaces
interface Document {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  processingStatus: string;
  extractedText?: string;
  createdAt: string;
}

interface CandidateScoring {
  id: string;
  overallScore: number;
  recommendation: string;
  breakdown?: any;
  strengths?: any;
  gaps?: any;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  candidateStatus: CandidateStatus;
  campaignId: string;
  documentId?: string;
  documents?: Document[];
  structuredData?: CVData;
  scoring?: CandidateScoring | null;
  createdAt: string;
  updatedAt: string;
}

// Process and Stage Instance interfaces
export interface StageInstance {
  id: string;
  status: StageStatus;
  feedback?: string;
  decision?: string;
  decidedAt?: string;
  stageTemplate: StageTemplate;
  responsible: {
    id: string;
    name: string;
    email: string;
  };
  attachments?: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface ProcessInstance {
  id: string;
  startDate: string;
  endDate?: string;
  currentStageOrder: number;
  candidate: Candidate;
  campaign: Campaign;
  stageInstances: StageInstance[];
  auditLogs?: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface StartProcessRequest {
  campaignId: string;
  candidateId: string;
  responsibleId?: string;
  startDate?: string;
  notifyCandidate?: boolean;
}

export interface UpdateStageRequest {
  decision: 'ACCEPTED' | 'REJECTED';
  feedback: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

interface CandidateFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CandidateStats {
  totalCandidates: number;
  pendingCandidates: number;
  processedCandidates: number;
  errorCandidates: number;
}

class ApiService {
  private token: string | null = null;
  public user: UserProfile | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  private async apiCall<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      console.log(`[API] calling ${url}`); // Debug Log
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }

        // Try to get error message from response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.text();
          if (errorBody) {
            const errorData = JSON.parse(errorBody);
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } catch (e) {
          // If we can't parse the error body, use the default message
        }

        console.error(`[API] Error calling ${url}:`, errorMessage);
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      console.error(`[API] Network error calling ${url}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Authentication methods
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    this.token = data.access_token;
    localStorage.setItem('token', this.token!);
    return data;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.access_token;
    localStorage.setItem('token', this.token!);
    return data;
  }

  initiateGoogleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  async activateAccount(token: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Activation failed');
    }

    const data = await response.json();
    return data;
  }

  async getProfile(): Promise<UserProfile> {
    const user = await this.apiCall<UserProfile>('/auth/profile');
    // Update local user state
    this.user = user;
    return user;
  }

  // Campaign methods
  async createCampaign(campaignData: CreateCampaignRequest): Promise<Campaign> {
    return this.apiCall('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.apiCall('/campaigns');
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    return this.apiCall(`/campaigns/${campaignId}`);
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    return this.apiCall(`/campaigns/${campaignId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    return this.apiCall(`/campaigns/${campaignId}`, {
      method: 'DELETE'
    });
  }

  async getPublicCampaign(publicId: string): Promise<Campaign> {
    const response = await fetch(`${API_BASE_URL}/campaigns/public/${publicId}`);
    if (!response.ok) {
      throw new Error('Campaign not found');
    }
    return response.json();
  }

  async getCampaignStats(): Promise<CampaignStats> {
    return this.apiCall('/campaigns/stats');
  }

  // Document upload methods
  async uploadDocument(data: UploadDocumentRequest): Promise<any> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('campaignPublicId', data.campaignPublicId);
    formData.append('candidateName', data.candidateName);
    formData.append('candidateEmail', data.candidateEmail);
    formData.append('candidatePhone', data.candidatePhone);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Document upload failed');
    }

    return response.json();
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!response.ok) {
      throw new Error('Document download failed');
    }

    return response.blob();
  }

  // Candidate methods
  async getCandidates(campaignId: string, filters: CandidateFilters = {}): Promise<Candidate[]> {
    // Clean filters to remove empty/undefined values
    const cleanFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanFilters[key] = String(value);
      }
    });

    const queryParams = new URLSearchParams(cleanFilters).toString();
    const url = `/candidates/campaign/${campaignId}${queryParams ? `?${queryParams}` : ''}`;

    console.log('getCandidates URL:', `${API_BASE_URL}${url}`);
    return this.apiCall(url);
  }

  async getCandidate(candidateId: string): Promise<Candidate> {
    return this.apiCall(`/candidates/${candidateId}`);
  }

  async getCandidateWithCampaign(campaignId: string, candidateId: string): Promise<Candidate> {
    // This endpoint must exist in backend, or we use the generic one. 
    // Given the user URL, it seems they use /campaigns/:id/candidates/:id
    return this.apiCall(`/campaigns/${campaignId}/candidates/${candidateId}`);
  }

  async getCandidateStructuredData(candidateId: string): Promise<CVData> {
    return this.apiCall(`/candidates/${candidateId}/structured-data`);
  }

  async searchCandidatesBySkills(campaignId: string, skills: string[]): Promise<Candidate[]> {
    return this.apiCall(`/candidates/campaign/${campaignId}/search-by-skills`, {
      method: 'POST',
      body: JSON.stringify({ skills })
    });
  }

  async updateCandidateStatus(candidateId: string, status: CandidateStatus): Promise<Candidate> {
    return this.apiCall(`/candidates/${candidateId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async exportCandidates(campaignId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/candidates/campaign/${campaignId}/export`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  async getCandidateStats(campaignId: string): Promise<CandidateStats> {
    return this.apiCall(`/candidates/campaign/${campaignId}/stats`);
  }

  async reprocessCandidate(candidateId: string): Promise<{ message: string; documentId: string; candidateId: string }> {
    if (!this.token) {
      throw new Error('No token available. Please login first.');
    }

    // First, get candidate details to get documentId
    const candidate = await this.apiCall(`/candidates/${candidateId}`);

    // Get documentId from either documentId field or documents array
    const documentId = candidate.documentId || candidate.documents?.[0]?.id;

    if (!documentId) {
      throw new Error('Candidate has no document to reprocess');
    }

    // Call the new reprocess endpoint
    const response = await this.apiCall(`/documents/${documentId}/reprocess`, {
      method: 'POST'
    });

    return response;
  }

  // Legacy CV processing method (for old functionality)
  async extractCV(file: File): Promise<CVData> {
    if (!this.token) {
      throw new Error('No token available. Please login first.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${CV_PROCESSING_URL}/resume/extract`, formData, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  async createCheckoutSession(plan: string): Promise<{ sessionId: string; url: string }> {
    return this.apiCall('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
  }

  // Process methods
  async startProcess(data: StartProcessRequest): Promise<ProcessInstance> {
    return this.apiCall('/processes/start', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getProcess(campaignId: string, candidateId: string): Promise<ProcessInstance> {
    return this.apiCall(`/processes/campaign/${campaignId}/candidate/${candidateId}`);
  }

  async updateStageDecision(stageInstanceId: string, data: UpdateStageRequest): Promise<StageInstance> {
    return this.apiCall(`/processes/stages/${stageInstanceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async getProcessAuditLog(processInstanceId: string): Promise<AuditLog[]> {
    return this.apiCall(`/processes/${processInstanceId}/audit`);
  }

  async getCampaignStages(campaignId: string): Promise<StageTemplate[]> {
    return this.apiCall(`/campaigns/${campaignId}/stages`);
  }

  // Notification methods
  async getNotifications(unreadOnly = false): Promise<Notification[]> {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return this.apiCall(`/notifications${query}`);
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return this.apiCall('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    return this.apiCall(`/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.apiCall('/notifications/mark-all-read', {
      method: 'PATCH'
    });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE'
    });
  }

  // User management methods (ADMIN only)
  async getUsers(): Promise<User[]> {
    return this.apiCall('/users');
  }

  async getUser(userId: string): Promise<User> {
    return this.apiCall(`/users/${userId}`);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    return this.apiCall(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.apiCall(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async getUsersByCompany(company: string): Promise<User[]> {
    return this.apiCall(`/users/by-company/${encodeURIComponent(company)}`);
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserProfile,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Campaign,
  CreateCampaignRequest,
  CampaignStats,
  CVData,
  Candidate,
  CandidateScoring,
  CandidateFilters,
  CandidateStats,
  UploadDocumentRequest,
  Document
};