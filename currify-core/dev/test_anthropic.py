import asyncio
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()
api_key = os.getenv("ANTHROPIC_API_KEY")
print("API Key starts with:", api_key[:10] if api_key else "None")

async def main():
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            messages=[{"role": "user", "content": "Hello world"}]
        )
        print("Response:", response.content[0].text)
    except Exception as e:
        print("Exception type:", type(e))
        print("Exception:", str(e))

asyncio.run(main())
