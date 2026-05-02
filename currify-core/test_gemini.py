import asyncio
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
print("API Key starts with:", api_key[:10] if api_key else "None")

genai.configure(api_key=api_key)

async def main():
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        config = genai.types.GenerationConfig(max_output_tokens=100, temperature=0.0)
        print("Sending request...")
        response = await model.generate_content_async("Hello world", generation_config=config)
        print("Response:", response.text)
    except Exception as e:
        print("Exception type:", type(e))
        print("Exception args:", e.args)
        print("Exception:", str(e))

asyncio.run(main())
