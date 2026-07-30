# 1) El front: compila el SPA de React
FROM node:22-alpine AS web
WORKDIR /src
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2) El backend: publica la API con el front ya dentro de wwwroot
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY server/TodoApp.Api/TodoApp.Api.csproj server/TodoApp.Api/
RUN dotnet restore server/TodoApp.Api/TodoApp.Api.csproj
COPY server/ server/
COPY --from=web /src/dist/ server/TodoApp.Api/wwwroot/
RUN dotnet publish server/TodoApp.Api/TodoApp.Api.csproj -c Release -o /app

# 3) Imagen final
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Sin tzdata, .NET se queda en UTC en silencio y el arrastre de tareas se descuadraría
# entre medianoche y las 2:00 (el backend calcula "hoy" con DateTime.Now).
RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY --from=api /app/ ./

ENV ASPNETCORE_URLS=http://0.0.0.0:8080 \
    ConnectionStrings__Default="Data Source=/data/todo.db" \
    TZ=Europe/Madrid \
    DOTNET_gcServer=0

EXPOSE 8080
ENTRYPOINT ["dotnet", "TodoApp.Api.dll"]
