# Use an official Node.js LTS image
FROM node:20-slim

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies needed for Chrome + Selenium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome (stable)
RUN wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update \
    && apt-get install -y /tmp/chrome.deb --no-install-recommends \
    && rm /tmp/chrome.deb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install node dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Chrome needs this env var to run headless in some setups
ENV CHROME_BIN=/usr/bin/google-chrome

# Expose a port if your script serves anything (adjust/remove if not needed)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
