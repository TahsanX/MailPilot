from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import config


def get_llm(temperature: float = 0.2):
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=config.GEMINI_API_KEY,
        temperature=temperature,
    )
