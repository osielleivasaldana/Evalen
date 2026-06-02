"""
Test script for authentication, extraction, and scoring services
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_auth_login():
    """Test authentication with username/password"""
    print_section("TEST 1: Authentication - Login with Credentials")

    url = f"{BASE_URL}/auth/login"

    # Test con body correcto
    print("\n✓ Testing with valid JSON body...")
    payload = {
        "username": "admin",
        "password": "change-me-in-production"
    }

    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    response = requests.post(url, json=payload)

    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("✅ Authentication SUCCESS")
        return response.json()["access_token"]
    else:
        print("❌ Authentication FAILED")
        return None

def test_auth_api_key():
    """Test authentication with API key"""
    print_section("TEST 2: Authentication - Login with API Key")

    url = f"{BASE_URL}/auth/login-api-key"
    payload = {
        "api_key": "api-key-1"
    }

    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    response = requests.post(url, json=payload)

    print(f"\nStatus Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("✅ API Key Authentication SUCCESS")
        return response.json()["access_token"]
    else:
        print("❌ API Key Authentication FAILED")
        return None

def test_health_check():
    """Test health check endpoint"""
    print_section("TEST 0: Health Check")

    url = f"{BASE_URL}/"
    response = requests.get(url)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("✅ Health Check SUCCESS")
    else:
        print("❌ Health Check FAILED")

def test_job_parsing(token):
    """Test job parsing endpoint"""
    print_section("TEST 3: Job Parsing")

    url = f"{BASE_URL}/scoring/parse-job"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "description": """Buscamos un Senior Backend Developer con experiencia en desarrollo de APIs RESTful.

Responsabilidades:
- Diseñar y desarrollar microservicios escalables
- Trabajar con bases de datos SQL y NoSQL
- Colaborar con equipos frontend y DevOps
- Mentoría a desarrolladores junior

Ofrecemos trabajo remoto, seguro médico mayor, y capacitación continua.""",
        "requirements": """- 3-5 años de experiencia en desarrollo backend
- Python avanzado
- FastAPI o Django
- PostgreSQL, MongoDB
- Docker y Kubernetes (deseable)
- Inglés intermedio (B2)
- Licenciatura en Computer Science o afín"""
    }

    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)[:500]}...")

    response = requests.post(url, json=payload, headers=headers)

    print(f"\nStatus Code: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
        print("✅ Job Parsing SUCCESS")
        return result
    else:
        print(f"Response: {response.text}")
        print("❌ Job Parsing FAILED")
        return None

def test_scoring(token, parsed_job):
    """Test scoring endpoint"""
    print_section("TEST 4: Candidate Scoring")

    url = f"{BASE_URL}/scoring/evaluate"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Mock candidate data
    candidate_data = {
        "datos_contacto": {
            "nombre_completo": "Juan Pérez García",
            "email": "juan.perez@example.com",
            "telefono": "+52 55 1234 5678",
            "ubicacion": "Ciudad de México, México"
        },
        "titular_profesional": {
            "titular": "Senior Backend Developer especializado en Python"
        },
        "resumen_profesional": {
            "resumen": "Desarrollador backend con 4 años de experiencia en Python, especializado en FastAPI y microservicios."
        },
        "experiencia_laboral": [
            {
                "cargo": "Backend Developer",
                "empresa": "TechCorp",
                "periodo": "2020-2024",
                "descripcion": "Desarrollo de APIs RESTful con FastAPI, PostgreSQL, Docker. Implementación de microservicios."
            },
            {
                "cargo": "Junior Developer",
                "empresa": "StartupXYZ",
                "periodo": "2019-2020",
                "descripcion": "Desarrollo web con Django y MySQL"
            }
        ],
        "formacion_academica": [
            {
                "titulo": "Ingeniería en Sistemas Computacionales",
                "institucion": "UNAM",
                "periodo": "2015-2019"
            }
        ],
        "habilidades": {
            "habilidades_tecnicas": [
                {"skill": "Python", "level": "Avanzado", "years_experience": 5},
                {"skill": "FastAPI", "level": "Avanzado", "years_experience": 3},
                {"skill": "PostgreSQL", "level": "Intermedio", "years_experience": 4},
                {"skill": "Docker", "level": "Intermedio", "years_experience": 2},
                {"skill": "MongoDB", "level": "Básico", "years_experience": 1}
            ],
            "idiomas": [
                {"idioma": "Español", "nivel": "Nativo"},
                {"idioma": "Inglés", "nivel": "B2"}
            ],
            "habilidades_blandas": ["Trabajo en equipo", "Comunicación", "Resolución de problemas"]
        },
        "formacion_complementaria": {
            "certificaciones_cursos": [
                {"nombre": "AWS Certified Developer", "institucion": "Amazon", "fecha": "2023"}
            ]
        }
    }

    # Complete job data
    job_data = {
        "titulo": "Senior Backend Developer",
        "empresa": "TechCorp Internacional",
        "ubicacion": "Ciudad de México - Remoto",
        "tipo": "Tiempo completo",
        "descripcion": "Buscamos un Senior Backend Developer...",
        "requisitos": parsed_job["requisitos"] if parsed_job else {
            "experiencia_años": "3-5 años",
            "habilidades_requeridas": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "habilidades_blandas": ["Trabajo en equipo", "Comunicación"],
            "educacion": "Licenciatura en Computer Science",
            "idiomas": ["Inglés B2"]
        },
        "habilidades_deseables": parsed_job.get("habilidades_deseables", ["Kubernetes"]) if parsed_job else ["Kubernetes"],
        "salario": "80,000 - 120,000 MXN",
        "beneficios": parsed_job.get("beneficios", ["Remoto", "Seguro médico"]) if parsed_job else ["Remoto", "Seguro médico"]
    }

    payload = {
        "candidate": candidate_data,
        "job": job_data
    }

    print(f"URL: {url}")
    print(f"Candidate: {candidate_data['datos_contacto']['nombre_completo']}")
    print(f"Job: {job_data['titulo']}")

    response = requests.post(url, json=payload, headers=headers, timeout=120)

    print(f"\nStatus Code: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\n📊 SCORING RESULTS:")
        print(f"Overall Score: {result['overall_score']}/100")
        print(f"Recommendation: {result['recommendation']}")
        print(f"\nBreakdown:")
        for dimension, score in result['breakdown'].items():
            print(f"  - {dimension}: {score['score']}/100 (weight: {score['weight']}%)")
        print(f"\nStrengths: {result['strengths'][:2]}...")
        print(f"Gaps: {result['gaps'][:2]}...")
        print(f"\nSummary: {result['summary'][:200]}...")
        print("\n✅ Scoring SUCCESS")
        return result
    else:
        print(f"Response: {response.text}")
        print("❌ Scoring FAILED")
        return None

def test_rubric():
    """Test rubric endpoint"""
    print_section("TEST 5: Get Scoring Rubric")

    url = f"{BASE_URL}/scoring/rubric"
    response = requests.get(url)

    print(f"Status Code: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\nWeights: {result['weights']}")
        print(f"Total Weight: {result['total_weight']}")
        print(f"Is Valid: {result['is_valid']}")
        print("✅ Rubric Retrieval SUCCESS")
    else:
        print(f"Response: {response.text}")
        print("❌ Rubric Retrieval FAILED")

def main():
    print("\n🚀 CURRIFY SERVICE TESTING")
    print("Testing Authentication, Job Parsing, and Scoring Services\n")

    try:
        # Test 0: Health check
        test_health_check()

        # Test 1: Auth with credentials
        token = test_auth_login()

        if not token:
            print("\n❌ Cannot continue without authentication token")
            return

        # Test 2: Auth with API key (alternative)
        test_auth_api_key()

        # Test 3: Job parsing
        parsed_job = test_job_parsing(token)

        # Test 4: Scoring
        test_scoring(token, parsed_job)

        # Test 5: Rubric
        test_rubric()

        print_section("ALL TESTS COMPLETED")
        print("✅ Testing finished successfully")

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
