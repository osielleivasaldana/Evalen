FROM node:18-alpine AS builder

# Declare build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_SCORING_SERVICE_URL
ARG REACT_APP_MAPBOX_TOKEN

# Set environment variables for build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SCORING_SERVICE_URL=$REACT_APP_SCORING_SERVICE_URL
ENV REACT_APP_MAPBOX_TOKEN=$REACT_APP_MAPBOX_TOKEN

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

# Copy custom nginx configuration as a template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 3000

# Remove strict healthcheck as Cloud Run does its own TCP/HTTP health checks
# and the port is dynamic. 

# Replace $PORT in nginx.conf using envsubst, keeping other variables untouched, then start nginx
CMD /bin/sh -c "envsubst '\\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"