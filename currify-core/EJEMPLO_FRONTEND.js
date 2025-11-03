/**
 * EJEMPLO DE INTEGRACIÓN FRONTEND
 * Flujo completo: Login → Parse Job → Score Candidate
 */

// ============================================
// 1. SERVICIO DE AUTENTICACIÓN
// ============================================

class AuthService {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.token = null;
  }

  /**
   * Login con credenciales
   */
  async login(username = 'kinich', password = 'kinich!') {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      this.token = data.access_token;

      // Guardar en localStorage
      localStorage.setItem('currify_token', this.token);

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Login con API Key (alternativa más simple)
   */
  async loginWithApiKey(apiKey = 'prod-key-12345') {
    try {
      const response = await fetch(`${this.baseURL}/auth/login-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'API key login failed');
      }

      const data = await response.json();
      this.token = data.access_token;
      localStorage.setItem('currify_token', this.token);

      return data;
    } catch (error) {
      console.error('API key login error:', error);
      throw error;
    }
  }

  /**
   * Recuperar token del localStorage
   */
  loadToken() {
    this.token = localStorage.getItem('currify_token');
    return this.token;
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    localStorage.removeItem('currify_token');
  }

  /**
   * Verificar si está autenticado
   */
  isAuthenticated() {
    return !!this.token || !!this.loadToken();
  }

  /**
   * Obtener headers con autenticación
   */
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token || this.loadToken()}`
    };
  }
}

// ============================================
// 2. SERVICIO DE SCORING
// ============================================

class ScoringService {
  constructor(authService, baseURL = 'http://localhost:8000') {
    this.authService = authService;
    this.baseURL = baseURL;
  }

  /**
   * Parsear descripción de job a formato estructurado
   */
  async parseJob(description, requirements = '') {
    try {
      const response = await fetch(`${this.baseURL}/scoring/parse-job`, {
        method: 'POST',
        headers: this.authService.getAuthHeaders(),
        body: JSON.stringify({ description, requirements })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Job parsing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Parse job error:', error);
      throw error;
    }
  }

  /**
   * Evaluar candidato vs puesto
   */
  async evaluateCandidate(candidateData, jobData) {
    try {
      const response = await fetch(`${this.baseURL}/scoring/evaluate`, {
        method: 'POST',
        headers: this.authService.getAuthHeaders(),
        body: JSON.stringify({
          candidate: candidateData,
          job: jobData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Scoring evaluation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Evaluate candidate error:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración de la rúbrica
   */
  async getRubric() {
    try {
      const response = await fetch(`${this.baseURL}/scoring/rubric`, {
        headers: this.authService.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to get rubric');
      }

      return await response.json();
    } catch (error) {
      console.error('Get rubric error:', error);
      throw error;
    }
  }
}

// ============================================
// 3. FLUJO COMPLETO DE APLICACIÓN
// ============================================

class CandidateApplicationService {
  constructor() {
    this.authService = new AuthService();
    this.scoringService = new ScoringService(this.authService);
  }

  /**
   * Flujo completo: desde que el usuario sube CV hasta obtener score
   */
  async processApplication(candidateCV, campaign) {
    try {
      console.log('🚀 Starting application process...');

      // 1. Verificar autenticación
      if (!this.authService.isAuthenticated()) {
        console.log('🔐 Authenticating...');
        await this.authService.login();
        console.log('✅ Authenticated');
      }

      // 2. Parsear descripción del job
      console.log('📝 Parsing job description...');
      const parsedJob = await this.scoringService.parseJob(
        campaign.description,
        campaign.requirements
      );
      console.log('✅ Job parsed:', parsedJob);

      // 3. Combinar datos del job
      const completeJobData = {
        titulo: campaign.title,
        empresa: campaign.company_name || 'No especificado',
        ubicacion: campaign.location || 'No especificado',
        tipo: campaign.employment_type || 'Tiempo completo',
        descripcion: campaign.description,
        requisitos: parsedJob.requisitos,
        habilidades_deseables: parsedJob.habilidades_deseables,
        salario: parsedJob.salario,
        beneficios: parsedJob.beneficios
      };

      // 4. Evaluar candidato
      console.log('⚖️ Evaluating candidate...');
      const scoring = await this.scoringService.evaluateCandidate(
        candidateCV,
        completeJobData
      );
      console.log('✅ Scoring completed:', scoring.overall_score);

      // 5. Retornar resultado completo
      return {
        success: true,
        parsedJob,
        completeJobData,
        scoring,
        candidateId: candidateCV.datos_contacto?.email, // o el ID real
        campaignId: campaign.id
      };

    } catch (error) {
      console.error('❌ Application process failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Guardar scoring en tu base de datos (ejemplo)
   */
  async saveScoringToDatabase(result) {
    // Aquí harías el POST a tu API de backend para guardar en Postgres
    const scoringRecord = {
      candidate_id: result.candidateId,
      campaign_id: result.campaignId,
      overall_score: result.scoring.overall_score,
      recommendation: result.scoring.recommendation,
      breakdown: result.scoring.breakdown,
      strengths: result.scoring.strengths,
      gaps: result.scoring.gaps,
      summary: result.scoring.summary,
      created_at: new Date().toISOString()
    };

    // POST a tu API
    const response = await fetch('/api/candidate-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoringRecord)
    });

    return response.json();
  }
}

// ============================================
// 4. EJEMPLO DE USO EN REACT/VUE
// ============================================

/**
 * Ejemplo en React
 */
function ApplyToCampaignButton({ candidate, campaign }) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const applicationService = new CandidateApplicationService();

  const handleApply = async () => {
    setLoading(true);

    try {
      // Procesar aplicación completa
      const result = await applicationService.processApplication(
        candidate.cv_data,  // JSON del CV (desde Postgres o state)
        campaign
      );

      if (result.success) {
        // Guardar en base de datos
        await applicationService.saveScoringToDatabase(result);

        // Mostrar resultado
        setResult(result.scoring);

        alert(`¡Aplicación exitosa! Score: ${result.scoring.overall_score}/100`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('Error al procesar la aplicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleApply} disabled={loading}>
        {loading ? 'Procesando...' : 'Aplicar a esta vacante'}
      </button>

      {result && (
        <div className="scoring-result">
          <h3>Resultado del Análisis</h3>
          <p>Score: {result.overall_score}/100</p>
          <p>Recomendación: {result.recommendation}</p>

          <h4>Fortalezas:</h4>
          <ul>
            {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h4>Áreas de mejora:</h4>
          <ul>
            {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// 5. EJEMPLO CON ASYNC/AWAIT PURO
// ============================================

async function ejemploCompleto() {
  // Inicializar servicios
  const authService = new AuthService();
  const scoringService = new ScoringService(authService);

  // 1. Login
  await authService.login('kinich', 'kinich!');
  // O con API key: await authService.loginWithApiKey('prod-key-12345');

  // 2. Datos del candidato (desde tu base de datos o state)
  const candidateCV = {
    datos_contacto: {
      nombre_completo: "Juan Pérez",
      email: "juan@example.com",
      telefono: "+52 55 1234 5678",
      ubicacion: "Ciudad de México"
    },
    experiencia_laboral: [
      {
        cargo: "Backend Developer",
        empresa: "TechCorp",
        periodo: "2020-2024",
        descripcion: "Desarrollo con Python y FastAPI"
      }
    ],
    // ... resto del CV
  };

  // 3. Datos de la campaña (desde tu base de datos)
  const campaign = {
    id: 123,
    title: "Senior Backend Developer",
    company_name: "TechCorp",
    location: "CDMX - Remoto",
    description: "Buscamos un desarrollador backend senior...",
    requirements: "3-5 años de experiencia, Python, FastAPI..."
  };

  // 4. Parsear job
  const parsedJob = await scoringService.parseJob(
    campaign.description,
    campaign.requirements
  );

  // 5. Preparar datos completos del job
  const jobData = {
    titulo: campaign.title,
    empresa: campaign.company_name,
    ubicacion: campaign.location,
    tipo: "Tiempo completo",
    descripcion: campaign.description,
    requisitos: parsedJob.requisitos,
    habilidades_deseables: parsedJob.habilidades_deseables,
    salario: parsedJob.salario,
    beneficios: parsedJob.beneficios
  };

  // 6. Evaluar candidato
  const scoring = await scoringService.evaluateCandidate(candidateCV, jobData);

  // 7. Resultado
  console.log('Score:', scoring.overall_score);
  console.log('Recommendation:', scoring.recommendation);
  console.log('Strengths:', scoring.strengths);
  console.log('Gaps:', scoring.gaps);

  return scoring;
}

// ============================================
// 6. EXPORT PARA MÓDULOS
// ============================================

// Si usas ES6 modules
export {
  AuthService,
  ScoringService,
  CandidateApplicationService
};

// Si usas CommonJS
// module.exports = {
//   AuthService,
//   ScoringService,
//   CandidateApplicationService
// };
