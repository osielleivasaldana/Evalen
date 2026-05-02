import asyncio
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

async def main():
    try:
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = await client.chat.completions.create(
            model="llama3-8b-8192",
            max_tokens=100,
            messages=[{"role": "user", "content": "Hello world"}]
        )
        print("Response:", response.choices[0].message.content)
    except Exception as e:
        print("Exception:", str(e))

asyncio.run(main())
