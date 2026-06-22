FROM python:3.12-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 appuser

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 5000

CMD ["python", "app.py"]