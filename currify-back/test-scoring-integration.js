/**
 * Script de diagnóstico para la integración NestJS -> FastAPI
 * Ejecutar con: node test-scoring-integration.js
 */

const axios = require('axios');

const SCORING_SERVICE_URL = 'http://localhost:8000';
const USERNAME = 'kinich';
const PASSWORD = 'kinich!';

async function testConnection() {
  console.log('🔍 DIAGNÓSTICO DE INTEGRACIÓN NESTJS -> FASTAPI\n');

  // 1. Test health check
  console.log('1️⃣ Testing FastAPI Health Check...');
  try {
    const response = await axios.get(`${SCORING_SERVICE_URL}/`);
    console.log('✅ FastAPI está corriendo');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Service: ${response.data.service}\n`);
  } catch (error) {
    console.log('❌ FastAPI NO está corriendo');
    console.log(`   Error: ${error.message}`);
    console.log(`   Asegúrate de iniciar FastAPI en el puerto 8000\n`);
    return false;
  }

  // 2. Test authentication
  console.log('2️⃣ Testing Authentication...');
  let token;
  try {
    const response = await axios.post(`${SCORING_SERVICE_URL}/auth/login`, {
      username: USERNAME,
      password: PASSWORD,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    token = response.data.access_token;
    console.log('✅ Autenticación exitosa');
    console.log(`   Token: ${token.substring(0, 50)}...\n`);
  } catch (error) {
    console.log('❌ Error de autenticación');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.detail || error.message}\n`);
    return false;
  }

  // 3. Test job parsing (con los campos correctos)
  console.log('3️⃣ Testing Job Parsing...');
  try {
    const response = await axios.post(`${SCORING_SERVICE_URL}/scoring/parse-job`, {
      description: 'Buscamos un desarrollador backend senior con experiencia en Python y FastAPI',
      requirements: '3-5 años de experiencia, Python, FastAPI, PostgreSQL',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });

    console.log('✅ Job Parsing exitoso');
    console.log('   Parsed Data:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...\n');
  } catch (error) {
    console.log('❌ Error en Job Parsing');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.detail || error.message}\n`);
    return false;
  }

  // 4. Test scoring evaluation
  console.log('4️⃣ Testing Scoring Evaluation...');
  try {
    const candidateData = {
      datos_contacto: {
        nombre_completo: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '+52 55 1234 5678',
        ubicacion: 'Ciudad de México'
      },
      experiencia_laboral: [
        {
          cargo: 'Backend Developer',
          empresa: 'TechCorp',
          periodo: '2020-2024',
          descripcion: 'Desarrollo con Python y FastAPI'
        }
      ],
      habilidades: {
        habilidades_tecnicas: [
          { skill: 'Python', level: 'Avanzado', years_experience: 5 },
          { skill: 'FastAPI', level: 'Avanzado', years_experience: 3 }
        ]
      }
    };

    const jobData = {
      titulo: 'Senior Backend Developer',
      empresa: 'TechCorp',
      ubicacion: 'CDMX',
      tipo: 'Tiempo completo',
      descripcion: 'Desarrollador backend senior',
      requisitos: {
        experiencia_años: '3-5 años',
        habilidades_requeridas: ['Python', 'FastAPI'],
        educacion: 'Licenciatura',
        idiomas: ['Español']
      }
    };

    const response = await axios.post(`${SCORING_SERVICE_URL}/scoring/evaluate`, {
      candidate: candidateData,
      job: jobData,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 120000 // 2 minutos
    });

    console.log('✅ Scoring Evaluation exitoso');
    console.log(`   Overall Score: ${response.data.overall_score}`);
    console.log(`   Recommendation: ${response.data.recommendation}\n`);
  } catch (error) {
    console.log('❌ Error en Scoring Evaluation');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.detail || error.message}\n`);
    return false;
  }

  console.log('✅ TODAS LAS PRUEBAS PASARON\n');
  console.log('📋 RESUMEN:');
  console.log('  - FastAPI está corriendo correctamente');
  console.log('  - Autenticación funcionando');
  console.log('  - Job Parsing funcionando');
  console.log('  - Scoring Evaluation funcionando');
  console.log('\n🎯 Tu integración NestJS -> FastAPI debería funcionar ahora\n');

  return true;
}

// Test de los campos que NestJS envía (ANTES del fix)
async function testOldFormat() {
  console.log('\n🔧 TESTING FORMATO VIEJO (el que causaba error)...\n');

  try {
    const response = await axios.post(`${SCORING_SERVICE_URL}/auth/login`, {
      username: USERNAME,
      password: PASSWORD,
    });

    const token = response.data.access_token;

    // Intentar con campos en español (INCORRECTO)
    const badResponse = await axios.post(`${SCORING_SERVICE_URL}/scoring/parse-job`, {
      descripcion: 'Test', // ❌ Campo incorrecto
      requisitos: 'Test',  // ❌ Campo incorrecto
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

  } catch (error) {
    console.log('❌ El formato viejo falla (como esperábamos)');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.detail || error.message}`);
    console.log('\n✅ Esto confirma que el fix era necesario\n');
  }
}

// Ejecutar tests
(async () => {
  const success = await testConnection();

  if (success) {
    await testOldFormat();
  } else {
    console.log('\n⚠️  PROBLEMAS DETECTADOS:');
    console.log('  1. Verifica que FastAPI esté corriendo: cd currify-core && uvicorn app.main:app');
    console.log('  2. Verifica el puerto 8000 esté libre');
    console.log('  3. Verifica las credenciales en .env del NestJS');
  }
})();
