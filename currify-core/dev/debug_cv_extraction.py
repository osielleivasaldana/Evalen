import asyncio
import logging
from pathlib import Path
from app.services.file_parser_service import FileParserService
# from app.services.pdf_service import PDFService  <-- REMOVED
from app.services.robust_extraction_service import RobustExtractionService
from app.models.resume import ResumeExtractionRequest
from app.services.llm_service import LLMService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def debug_extraction():
    # Attempt to use local file inside container
    file_path = "debug_cv.pdf"
    
    print(f"DEBUG: Testing extraction for: {file_path}")
    
    if not Path(file_path).exists():
        print(f"ERROR: File not found at {file_path}")
        return

    with open(file_path, "rb") as f:
        content = f.read()

    # 1. Test FileParserService (PDFPlumber)
    print("\n" + "="*50)
    print("TESTING FILE PARSER SERVICE (PDFPlumber)")
    print("="*50)
    
    parser = FileParserService()
    result = parser.parse_file(content, file_path)
    
    if result["success"]:
        text = result["text"]
        print(f"Successfully extracted {len(text)} characters.")
        print("-" * 20)
        print("LAST 1000 CHARACTERS (Likely containing Skills):")
        print(text[-1000:])
        print("-" * 20)
        
        # Check for specific skill keywords
        keywords = ["Habilidades", "Skills", "Tecnologías", "Java", "Python", "Scrum"]
        print("\nKeyword Check in Raw Text:")
        for kw in keywords:
            found = kw.lower() in text.lower()
            print(f"- {kw}: {'FOUND' if found else 'MISSING'}")
    else:
        print(f"Extraction failed: {result['error']}")

    # 2. Test RobustExtractionService Full Pipeline
    print("\n" + "="*50)
    print("TESTING FULL ROBUST EXTRACTION (LLM INFERENCE)")
    print("="*50)
    
    try:
        llm_service = LLMService()
        # Ensure API keys are loaded (should be in env)
        if not llm_service.api_key:
             print("WARNING: LLM Service might not have API KEY configured.")
        
        robust_service = RobustExtractionService(llm_service)
        
        
        # Use text from Step 1
        if not result["success"]:
            print("Skipping step 2 because extraction failed.")
            return

        request = ResumeExtractionRequest(
            nombre_archivo=file_path, 
            archivo_contenido=result["text"],
            tipo_archivo="pdf"
        )
        
        print("Creating request...")
        # Note: extract_from_text is async, already in async def
        response = await robust_service.extract_from_text(request)
        
        print("\n" + "="*20)
        print("EXTRACTION RESULT - SKILLS")
        print("="*20)
        
        habilidades = response.datos_cv.habilidades
        print(f"Habilidades Técnicas: {len(habilidades.habilidades_tecnicas)}")
        for h in habilidades.habilidades_tecnicas:
            print(f" - {h}")
            
        print(f"\nIdiomas: {len(habilidades.idiomas)}")
        for i in habilidades.idiomas:
            print(f" - {i}")

        print("\n" + "="*20)
        print("EXTRACTION RESULT - EXPERIENCIA")
        print("="*20)
        for exp in response.datos_cv.experiencia_laboral:
            p = exp.periodo
            start = p.fecha_inicio or "NAN"
            end = p.fecha_fin or "NAN"
            raw = p.texto_original or ""
            print(f"- {exp.empresa} | {exp.cargo}")
            print(f"  Dates: {start} to {end}")
            print(f"  Raw: '{raw}'")
            print("-" * 10)

    except Exception as e:
        print(f"Pipeline failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    # Need to setup basic logging if not already done
    logging.basicConfig(level=logging.INFO)
    asyncio.run(debug_extraction())
