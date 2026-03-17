import json
from typing import List, Dict, Any

# Mocking the deduplication logic currently missing in the service
# I will implement the logic here first to verify it, then move it to the service.

def deduplicate_education(edu_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not edu_list:
        return []
    
    # 1. Group by normalized key (Title + Institution)
    grouped = {}
    
    for edu in edu_list:
        # Normalize
        titulo = str(edu.get("titulo", "")).lower().strip()
        institucion = str(edu.get("institucion", "")).lower().strip()
        
        # Simple normalization: remove punctuation, extra spaces
        import re
        titulo_norm = re.sub(r'[^\w\s]', '', titulo)
        inst_norm = re.sub(r'[^\w\s]', '', institucion)
        
        key = f"{titulo_norm}|{inst_norm}"
        
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(edu)
        
    # 2. Select best candidate per group
    final_list = []
    
    for key, candidates in grouped.items():
        if len(candidates) == 1:
            final_list.append(candidates[0])
            continue
            
        # Selection Logic:
        # Prefer entry with explicit dates over "N/A" or "Presente" (unless it is actually present)
        # But here "N/A - Presente" vs "dic 2020 - dic 2020" -> "dic 2020" is better because it's specific.
        # "N/A - Presente" is likely a default fallback when date wasn't found in that chunk.
        
        best = candidates[0]
        best_score = -1
        
        for cand in candidates:
            score = 0
            periodo = cand.get("periodo", {})
            inicio = str(periodo.get("fecha_inicio", "")).lower()
            fin = str(periodo.get("fecha_fin", "")).lower()
            
            # Score based on date quality
            if inicio and "n/a" not in inicio and "no especificado" not in inicio:
                score += 2
            if fin and "n/a" not in fin and "no especificado" not in fin:
                score += 2
            
            # Penalize "Presente" if it seems to be a fallback for a past event (heuristic?)
            # Actually, we just want the most specific date. 
            # "dic 2020" is better than "N/A".
            
            # Tie-breaker: content length (maybe one has 'status')
            score += len(json.dumps(cand)) * 0.001
            
            if score > best_score:
                best_score = score
                best = cand
        
        final_list.append(best)
        
    return final_list

def test_education_deduplication():
    print("Testing Education Deduplication...")
    
    # User data reproduction
    # Group 1: Certificación Big Data
    # Group 2: Curso AWS
    # Group 3: Diplomado IA
    raw_data = [
        # Item 1a
        {
            "titulo": "Certificación en Big Data y Analytics",
            "institucion": "Cisco Networking Academy",
            "periodo": {"fecha_inicio": "N/A", "fecha_fin": "Presente"}
        },
        # Item 2a
        {
            "titulo": "Curso “Habilidades Tech: Tu talento en la nube - powered by AWS”",
            "institucion": "No especificado",
            "periodo": {"fecha_inicio": "N/A", "fecha_fin": "Presente"}
        },
        # Item 3a
        {
            "titulo": "Diplomado en Inteligencia Artificial",
            "institucion": "Pontificia Universidad Católica de Valparaíso",
            "periodo": {"fecha_inicio": "N/A", "fecha_fin": "Presente"}
        },
        # Item 1b (Better dates)
        {
            "titulo": "Certificación en Big Data y Analytics",
            "institucion": "Cisco Networking Academy",
            "periodo": {"fecha_inicio": "dic 2020", "fecha_fin": "dic 2020"}
        },
        # Item 2b (Better dates)
        {
            "titulo": "Curso “Habilidades Tech: Tu talento en la nube - powered by AWS”",
            "institucion": "No especificado",
            "periodo": {"fecha_inicio": "dic 2020", "fecha_fin": "dic 2020"}
        },
        # Item 3b (Better dates)
        {
            "titulo": "Diplomado en Inteligencia Artificial",
            "institucion": "Pontificia Universidad Católica de Valparaíso",
            "periodo": {"fecha_inicio": "dic 2017", "fecha_fin": "dic 2017"}
        }
    ]
    
    print(f"Input items: {len(raw_data)}")
    
    deduped = deduplicate_education(raw_data)
    
    print(f"Output items: {len(deduped)}")
    
    for item in deduped:
        print(f"Kept: {item['titulo'][:30]}... | {item['periodo']['fecha_inicio']}")
        
    # Assertions
    assert len(deduped) == 3, f"Expected 3 unique items, got {len(deduped)}"
    
    # Check that we kept the specific dates
    for item in deduped:
        assert "N/A" not in item["periodo"]["fecha_inicio"], f"Kept N/A date for {item['titulo']}"
        
    print("\nEducation Deduplication Test PASSED")

if __name__ == "__main__":
    try:
        test_education_deduplication()
    except Exception as e:
        print(f"\nDeduplication test FAILED: {e}")
        import traceback
        traceback.print_exc()
