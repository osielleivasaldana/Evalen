
import logging
import sys
import os

# Create dummy classes to simulate service structure
class MockScoringService:
    def __init__(self):
        pass

    def _token_fuzzy_match(self, req_phrase: str, cand_phrase: str) -> bool:
        # Synonyms Map (Normalized to lowercase)
        SYNONYMS = {
            "developer": ["desarrollador", "programador", "dev", "ingeniero"],
            "desarrollador": ["developer", "programador", "dev", "ingeniero"],
            "engineer": ["ingeniero", "arquitecto", "lider"],
            "ingeniero": ["engineer", "arquitecto", "lider"],
            "qa": ["test", "testing", "calidad", "quality", "automator", "automation"],
            "test": ["qa", "testing", "pruebas"],
            "full": ["fullstack", "full-stack"],
            "fullstack": ["full", "full-stack"],
            "data": ["datos", "analista"],
            "datos": ["data"],
            "computacion": ["informatica", "sistemas", "software"],
            "informatica": ["computacion", "sistemas", "software"],
            "civil": [], # Specific
            "ingles": ["english"],
            "english": ["ingles"]
        }

        # 1. Normalize both phrases
        def normalize(s):
            replacements = (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"))
            s = s.lower().strip()
            for a, b in replacements: s = s.replace(a, b)
            return s
        
        # 2. Get stems for a word
        def get_stem(word):
            w = word.strip(",").strip(".").strip()
            return w.rstrip('os').rstrip('as').rstrip('es').rstrip('o').rstrip('a').rstrip('ico').rstrip('ica').rstrip('ia')

        req_text = normalize(req_phrase)
        cand_text = normalize(cand_phrase)
        
        print(f"DEBUG: Comparing '{req_text}' vs '{cand_text}'")

        req_words = req_text.split()
        cand_words = cand_text.split()
        
        req_stems = []
        for w in req_words:
            if len(w) < 3 and w not in ["qa", "ux", "ui"]: continue 
            if w in ["de", "en", "el", "la", "los", "las", "y", "o", "del"]: continue
            req_stems.append(w) 
        
        cand_stems = [get_stem(w) for w in cand_words] 
        cand_words_set = set(cand_words) 

        if not req_stems: return True

        matches = 0
        for rw in req_stems:
            matched_this_word = False
            r_stem = get_stem(rw)
            
            # A. Direct Stem Match
            if any(r_stem in cs or cs in r_stem for cs in cand_stems if len(cs) > 2):
                matched_this_word = True
                print(f"  Match: Stem '{r_stem}' found in candidates")
            
            # B. Synonym Match
            if not matched_this_word and rw in SYNONYMS:
                print(f"  Checking synonyms for '{rw}': {SYNONYMS[rw]}")
                for syn in SYNONYMS[rw]:
                    if syn in cand_words_set: 
                        matched_this_word = True
                        print(f"  Match: Synonym '{syn}' found in candidate words")
                        break
                    syn_stem = get_stem(syn)
                    if any(syn_stem in cs for cs in cand_stems if len(cs) > 2):
                        matched_this_word = True
                        print(f"  Match: Synonym stem '{syn_stem}' found in candidate stems")
                        break

            if matched_this_word:
                matches += 1
            else:
                print(f"  Miss: '{rw}' not found")
        
        print(f"  Total Matches: {matches}/{len(req_stems)}")
        return matches >= len(req_stems) * 0.66

def test_education_scoring():
    service = MockScoringService()
    
    # Data from user inputs
    # Rubric Requirement: "Ingeniería en Informática, Programación o carrera afín"
    # NOTE: The service code splits by ' o ' and ',' -> ["Ingeniería en Informática", "Programación", "carrera afín"]
    req_titles_raw = ["Ingeniería en Informática", "Programación", "carrera afín"]
    
    # Candidate Degree: "Ingeniería en Computación y Licenciatura en Ciencias de la Computación"
    cand_degrees = ["Ingeniería en Computación y Licenciatura en Ciencias de la Computación"]
    
    print("--- TEST 1: Direct Matching ---")
    for req in req_titles_raw:
        for cand in cand_degrees:
            match = service._token_fuzzy_match(req, cand)
            print(f"Result: {match} (Req: {req} | Cand: {cand})")
            if match:
                print("SUCCESS: Match Found!")
                return

    print("\nFAILURE: No match found.")

if __name__ == "__main__":
    test_education_scoring()
