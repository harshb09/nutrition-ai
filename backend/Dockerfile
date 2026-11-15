FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application and precomputed offline artifacts
COPY app/ ./app/
COPY artifacts/ ./artifacts/

ENV PORT=8000
ENV ARTIFACTS_DIR=/app/artifacts
ENV CORS_ORIGINS="*"

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
