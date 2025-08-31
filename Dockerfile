FROM ubuntu:22.04

# Evita prompts do apt
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências básicas e Python
RUN apt-get update && apt-get install -y \
    python3 python3-venv python3-pip \
    curl git build-essential \
 && rm -rf /var/lib/apt/lists/*

# Cria diretório de trabalho
WORKDIR /app

# Instala NVM e Node.js 22

ENV NVM_DIR=/root/.nvm
RUN curl -fsSL https://ollama.com/install.sh | sh
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    nvm install 22 && \
    nvm use 22 && \
    nvm alias default 22



# Adiciona Node e npm ao PATH
ENV NODE_PATH=$NVM_DIR/versions/node/v22.19.0/lib/node_modules
ENV PATH=$NVM_DIR/versions/node/v22.19.0/bin:$PATH

# Verifica versões (opcional)
RUN node -v && npm -v

# Copia apenas requirements do Python e instala
COPY solver/requirements.txt ./solver/requirements.txt
RUN pip install --upgrade pip \
 && pip install -r solver/requirements.txt

# Configura volume para desenvolvimento interativo
VOLUME ["/app"]

# Define shell padrão
CMD ["/bin/bash"]
