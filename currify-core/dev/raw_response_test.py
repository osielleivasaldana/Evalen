#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.llm_service import LLMService

async def test_raw_response():
    """Test to see what LLM returns for titular extraction"""

    llm_service = LLMService()

    # CV text like Osiel's
    cv_text = """
    Osiel Leiva Saldaña
    Ingeniero Informático
    Email: osielleivasaldana@gmail.com
    Teléfono: +56 967891153

    EXPERIENCIA LABORAL
    QA Test Lead Automation Engineer - Kibernum S.A (2024 - Actualidad)
    - Automatización de pruebas con Selenium y Java

    FORMACIÓN COMPLEMENTARIA
    - Certificación en Big Data y Analytics
    - Diplomado en Inteligencia Artificial
    """

    # Simple prompt to extract titular
    prompt = """
Extrae información de este CV en formato JSON exacto:

{
  "datos_contacto": {
    "nombre_completo": "string",
    "email": "string",
    "telefono": "string"
  },
  "titular_profesional": {
    "titular": "string - El título profesional principal de la persona"
  },
  "experiencia_laboral": [...],
  "formacion_complementaria": {
    "certificaciones_cursos": [...]
  }
}

CV:
""" + cv_text

    try:
        print("Calling LLM directly...")
        raw_response = await llm_service._call_anthropic_api(prompt, 0.1)

        print("=== RAW LLM RESPONSE ===")
        print(raw_response)
        print("=== END RAW RESPONSE ===")

        print("\nParsing response...")
        parsed = llm_service._extract_json_from_response(raw_response, "test_parse")

        if parsed:
            print(f"\nParsed titular_profesional: {parsed.get('titular_profesional')}")
            print(f"Parsed datos_contacto: {parsed.get('datos_contacto')}")
        else:
            print("Failed to parse JSON")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_raw_response())