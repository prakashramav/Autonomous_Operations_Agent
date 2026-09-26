import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.config import settings

class GeminiService:
    def __init__(self):
        self.api_key = settings.effective_gemini_key
        self.client: Optional[genai.Client] = None
        if self.api_key and not self.api_key.startswith("your-"):
            self.client = genai.Client(api_key=self.api_key)

    def is_configured(self) -> bool:
        # Re-check in case user updated .env or env var dynamically
        current_key = settings.effective_gemini_key
        if current_key and not current_key.startswith("your-"):
            if self.client is None or self.api_key != current_key:
                self.api_key = current_key
                self.client = genai.Client(api_key=self.api_key)
            return True
        return False

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Streams text chunks from Gemini or a dev-mode simulator if API key is not yet set."""
        if not self.is_configured():
            # Friendly fallback simulation when no Gemini key is set yet
            sample_response = (
                "Hello! I am your Enterprise Operations Agent (Phase 1 scaffold).\n\n"
                "I am running end-to-end between your Next.js frontend and FastAPI backend powered by Google Gemini. "
                "To connect directly to Gemini, paste your `GEMINI_API_KEY` into `backend/.env`.\n\n"
                "Your operational query was received:\n> " + (messages[-1]["content"] if messages else "")
            )
            words = sample_response.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.04)
            return

        # Real Gemini Streaming API
        sys_instruction = system_prompt or (
            "You are the Enterprise Operations Assistant, an AI agent for enterprise employees. "
            "Help users plan tasks, query documents, and execute operational workflows accurately and professionally."
        )

        # Build contents from messages history
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                )
            )

        config = types.GenerateContentConfig(
            system_instruction=sys_instruction,
            temperature=settings.DEFAULT_TEMPERATURE,
        )

        try:
            response_stream = await self.client.aio.models.generate_content_stream(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"\n[Gemini API Error: {str(e)}]"

gemini_service = GeminiService()
