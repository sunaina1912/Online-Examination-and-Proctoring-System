FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY python/requirements.txt ./python/requirements.txt
RUN pip install --upgrade pip setuptools wheel && pip install -r ./python/requirements.txt

COPY python ./python

EXPOSE 8001
CMD ["python", "-m", "uvicorn", "proctoring_service.main:app", "--app-dir", "python", "--host", "0.0.0.0", "--port", "8001"]
