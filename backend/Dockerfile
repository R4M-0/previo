FROM python:3.12-slim

# Install pdflatex and required LaTeX packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure the data directory exists for SQLite
RUN mkdir -p /app/backend/data

# Utility image for running backend scripts directly, e.g.:
# docker run --rm -it <image> python3 db/sqlite_service.py --action list_projects
CMD ["python3", "db/sqlite_service.py", "--help"]
