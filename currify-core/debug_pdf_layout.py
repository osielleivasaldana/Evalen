import pdfplumber
import sys

filename = "debug_cv.pdf"

print(f"Analyzing {filename}...")

with pdfplumber.open(filename) as pdf:
    for i, page in enumerate(pdf.pages):
        print(f"\n--- PAGE {i+1} DEFAULT ---")
        text = page.extract_text(x_tolerance=2, y_tolerance=3)
        print(text[-1000:]) # Print last part where skills are

        print(f"\n--- PAGE {i+1} LAYOUT=TRUE (Focused) ---")
        text_layout = page.extract_text(layout=True)
        if text_layout:
             # Check for Spacing Issue
             if "Aumenté" in text_layout or "Aumentélacobertura" in text_layout:
                 print(">> FOUND 'Aumenté' CONTEXT:")
                 idx = text_layout.find("Aumenté")
                 if idx == -1: idx = text_layout.find("Aumentélacobertura")
                 print(text_layout[idx:idx+300])
             
             # Check for Date Issue section
             if "Kibernum" in text_layout:
                 print("\n>> FOUND 'Kibernum' CONTEXT:")
                 idx = text_layout.find("Kibernum")
                 print(text_layout[idx:idx+300])
        
        # EXPERIMENT 1: char_margin adjustment
        print(f"\n--- PAGE {i+1} LAYOUT w/ char_margin=3.0 (Loose Lines) ---")
        try:
             # loose char margin to prevent line merging issues, but irrelevant for words
             text_laparams = page.extract_text(layout=True, char_margin=3.0)
             if text_laparams and ("Aumenté" in text_laparams or "Aumentélacobertura" in text_layout):
                 idx = text_laparams.find("Aumenté")
                 if idx == -1: idx = text_laparams.find("Aumenté")
                 print(text_laparams[idx:idx+300] if idx != -1 else text_laparams[:300])
        except Exception as e:
             print(f"Error: {e}")

        # EXPERIMENT 2: word_margin adjustment (STRICT)
        print(f"\n--- PAGE {i+1} LAYOUT w/ word_margin=0.01 (Strict Spaces) ---")
        try:
             # Reduce margin so even tiny gaps make a space
             text_laparams = page.extract_text(layout=True, word_margin=0.05)
             if text_laparams:
                 idx = text_laparams.find("Aumenté")
                 print(text_laparams[idx:idx+300] if idx != -1 else text_laparams[:100])
        except Exception as e:
             print(f"Error: {e}")
        
        print(f"\n--- PAGE {i+1} DENSITY ---")
        # Try extracting words to see coordinates
        # words = page.extract_words()
        # for w in words[-20:]:
        #    print(w)
