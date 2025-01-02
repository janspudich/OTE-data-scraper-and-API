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

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist 

EXPOSE 3002

CMD ["node", "dist/oteDataApi.js"] 
