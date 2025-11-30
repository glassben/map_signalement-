FROM selenium/standalone-chrome

# Install Node.js + npm
RUN apt-get update && apt-get install -y curl \
 && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
 && apt-get install -y nodejs

WORKDIR /app
COPY . .
RUN npm install

CMD ["node", "index.js"]