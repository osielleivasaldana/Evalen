import asyncio
import json
import os
import sys
from dotenv import load_dotenv

os.environ["API_SECRET_KEY"] = "test_key"
os.environ["LLM_PROVIDER"] = "google"

# Agregar la ruta del proyecto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(env_path)

from app.services.llm_service import LLMService
from app.services.robust_extraction_service import RobustExtractionService
from app.models.resume import ResumeExtractionRequest
from app.core.config import settings

async def main():
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "samples", "cvs", "CUR_Logan Higuera _1.pdf")
    
    # Let the service extract text
    print(f"--- Extracting from {pdf_path} ---")
    
    llm_service = LLMService()
    extraction_service = RobustExtractionService(llm_service)
    
    with open(pdf_path, 'rb') as f:
        file_bytes = f.read()
        
    print("--- Running extraction ---")
    response = await extraction_service.extract_from_file(file_content=file_bytes, filename="CUR_Logan Higuera _1.pdf")
    
    print("\n--- RESULTS ---")
    print(response.model_dump_json(indent=2))

if __name__ == "__main__":
    # Ensure google provider is set if not by env
    os.environ["LLM_PROVIDER"] = "google"
    asyncio.run(main())
