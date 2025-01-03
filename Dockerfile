## -*- dockerfile-image-name: "OTE-data-scraper-and-API" -*-

FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build 

# Production stage
FROM node:18-alpine

WORKDIR /app

ARG port=3002

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env ./ 

EXPOSE $port

CMD ["node", "dist/oteDataApi.js"] 
