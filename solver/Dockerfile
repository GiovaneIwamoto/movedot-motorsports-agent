FROM python:3.11-slim

WORKDIR /solver

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    tini \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


COPY . .


#TO RUN WITH OLLAMA ------------------------------------------------------------
# RUN curl -L https://ollama.com/install.sh | bash 

# RUN chmod +x start_ollama.sh

# ENTRYPOINT ["/usr/bin/tini", "--"]

# CMD ["sh", "-c", "./start_ollama.sh && uvicorn main:app --host 0.0.0.0 --port 5000"]



#TO RUN WITHOUT OLLAMA ---------------------------------------------------------
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 5000"]


