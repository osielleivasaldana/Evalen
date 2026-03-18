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

# Copy custom nginx configuration directly
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]