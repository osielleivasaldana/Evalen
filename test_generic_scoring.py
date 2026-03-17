
import asyncio
import logging
from app.services.scoring_service import ScoringService

# Configure logging
logging.basicConfig(level=logging.INFO)

async def test_generic_scoring():
    service = ScoringService()
    
    # 1. Candidate with "Hidden" Skills and "Non-Standard" Titles
    candidate = {
        "datos_personales": {"nombre": "Test Candidate", "email": "test@example.com"},
        "resumen_profesional": {
            "resumen": "Profesional con experiencia en creación de tiendas online usando Magento y Shopify. Experto en ventas digitales."
        },
        "experiencia_laboral": [
            {
                "cargo": "Automatizador QA",  # Non-standard title (vs QA Automation Engineer)
                "empresa": "Tech Corp",
                "periodo": "2020 - Actualidad",
                "responsabilidades": "Responsable de la calidad del software. Uso de Selenium y Appium. Implementación de pruebas automatizadas."
            },
            {
                "cargo": "Desarrollador Web",
                "empresa": "Agency",
                "periodo": "2018 - 2020",
                "responsabilidades": "Desarrollo de portales de comercio electrónico con Magento y pagos digitales (Webpay)."
            }
        ],
        "habilidades": {
            "habilidades_tecnicas": ["Selenium", "Python"], # Defines explicit skills - Missing "E-commerce", "Retail"
            "idiomas": ["Español Nativo"]
        },
        "formacion_academica": [
            {"titulo": "Ingeniero Informático", "institucion": "Universidad X", "estado": "Completado"}
        ]
    }

    # 2. Job with Standard Requirements
    job = {
        "title": "QA Automation Engineer", # Requires "QA Automation Engineer"
        "description": """
        Buscamos un Ingeniero de Automatización QA (QA Automation Engineer) con experiencia en E-commerce y Retail.
        Requisitos:
        - Experience in Automated Testing.
        - Knowledge of E-commerce flows (Checkout, Payments).
        - Skills: Python, Selenium, E-commerce, Retail.
        """,
        "requirements": ["Python", "Selenium", "E-commerce", "Retail"]
    }

    print("\n--- STARTING EVALUATION ---")
    response = await service.evaluate_candidate(candidate, job)
    
    if response:
        print(f"\n✅ Evaluation Completed!")
        print(f"Overall Score: {response.overall_score}/100")
        print(f"Breakdown: {response.breakdown}")
        
        # ASSERTIONS
        # 1. Role Match should be high (Automatizador QA ~ QA Automation Engineer)
        exp_score = response.breakdown.get('experience', {}).score
        print(f"Experience Score: {exp_score} (Expected > 70)")
        
        # 2. Skills Match should detect "E-commerce" from "Magento" description
        skills_score = response.breakdown.get('skills_match', {}).score
        print(f"Skills Score: {skills_score} (Expected > 70)")
        
        if exp_score > 70 and skills_score > 70:
            print("\n🎉 SUCCESS: AI correctly normalized roles and extracted latent skills!")
        else:
            print("\n⚠️ FAILURE: Scores are too low.")
    else:
        print("\n❌ Evaluation Failed (None response)")

if __name__ == "__main__":
    asyncio.run(test_generic_scoring())
