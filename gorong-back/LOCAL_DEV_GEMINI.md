# Local Dev: Gemini API (Environment Variable Only)

This backend reads the Gemini key from the OS environment variable `GEMINI_API_KEY`.

Rules:
- Do NOT hardcode API keys in code.
- Do NOT commit keys to git (no `.env` checked in).
- Do NOT modify `application.yml` to store secrets.

## 1) Get a Gemini API Key
- Create/manage keys in Google AI Studio.

## 2) Set `GEMINI_API_KEY` (each developer does this locally)

### Windows (User environment variable)
1. Open: "Edit the system environment variables"
2. Click: "Environment Variables..."
3. Under "User variables" -> "New..."
4. Name: `GEMINI_API_KEY`
5. Value: your key
6. Restart your terminal / IDE

Verify (PowerShell):
```powershell
if ($env:GEMINI_API_KEY) { "GEMINI_API_KEY is set" } else { "GEMINI_API_KEY is NOT set" }
```

### macOS/Linux (zsh/bash)
Temporary (current terminal):
```bash
export GEMINI_API_KEY="YOUR_KEY"
```
Persistent:
- add the `export ...` line to `~/.zshrc` or `~/.bashrc`, then restart the terminal.

## 3) Run backend (Windows PowerShell)

From repo root:
```powershell
cd gorong-back

# required for this project to boot locally (do not commit these)
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="<your db password>"
$env:TOUR_API_KEY="dev"
$env:JUSO_API_KEY="dev"
$env:JUSO_COORD_API_KEY="dev"

.\gradlew bootRun --args="--server.port=8080 --spring.main.lazy-initialization=true --spring.jpa.hibernate.ddl-auto=none --spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect"
```

## 4) Test chatbot API
```powershell
$body = @{ message = "안녕! 한 문장으로 자기소개해줘." } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri "http://localhost:8080/api/chatbot/chat" -ContentType "application/json" -Body $body
```

Expected:
- `200 OK` with JSON like `{"answer":"..."}`
- If the key is missing: `503` with a message about `GEMINI_API_KEY`
