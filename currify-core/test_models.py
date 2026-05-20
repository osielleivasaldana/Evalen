import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

try:
    models = genai.list_models()
    for m in models:
        print(m.name)
except Exception as e:
    print("Exception:", str(e))
