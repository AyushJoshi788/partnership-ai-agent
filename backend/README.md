# Partnership AI Agent

A premium AI assistant for SDG 17 built with FastAPI, SQLite, and a polished vanilla JavaScript frontend.

## Features

- Natural-language chat for SDG 17 and sustainability topics
- Smart welcome experience with example prompts and quick suggestions
- Conversation history and reopenable chats
- Animated typing indicator and professional loading overlay
- Markdown rendering for headings, lists, tables, and code blocks
- Copy buttons for every assistant response
- TXT and PDF export for conversations
- Clear chat confirmation and toast notifications
- SQLite-backed chat history persistence

## Screenshots

- Modern glassmorphism dashboard
- Premium AI chat workspace
- Conversation history and quick suggestions

## Installation

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Create your environment file:
   ```bash
   copy .env.example .env
   ```
3. Add your Gemini API key to .env
4. Start the backend:
   ```bash
   uvicorn app:app --reload
   ```

## Run the frontend

Open the frontend index.html file in a browser.

The backend will be available at http://127.0.0.1:8000.
