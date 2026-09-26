import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from anthropic import AsyncAnthropic
from app.config import settings

class ClaudeService:
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.client: Optional[AsyncAnthropic] = None
        if self.api_key and self.api_key.strip() and not self.api_key.startswith("your-"):
            self.client = AsyncAnthropic(api_key=self.api_key)

    def is_configured(self) -> bool:
        return self.client is not None

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Streams text chunks from Claude or a dev-mode simulator if API key is not yet set."""
        if not self.is_configured():
            # Friendly fallback simulation when no API key is set yet
            sample_response = (
                "Hello! I am your Enterprise Operations Agent (Phase 1 scaffold).\n\n"
                "I am running end-to-end between your Next.js frontend and FastAPI backend. "
                "To connect directly to Claude 3.7 / Claude 3.5 Sonnet, provide your `ANTHROPIC_API_KEY` "
                "in `backend/.env` or the root `.env` file.\n\n"
                "Your query was received:\n> " + messages[-1]["content"] if messages else ""
            )
            # Stream words with slight delay to mimic token generation
            words = sample_response.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                await asyncio.sleep(0.04)
            return

        # Real Anthropic Streaming API
        sys_arg = system_prompt or (
            "You are the Enterprise Operations Assistant, an AI agent for enterprise employees. "
            "Help users plan tasks, query documents, and execute operational workflows accurately and professionally."
        )

        async with self.client.messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            temperature=settings.DEFAULT_TEMPERATURE,
            system=sys_arg,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

claude_service = ClaudeService()
