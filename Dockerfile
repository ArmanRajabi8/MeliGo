FROM node:22-alpine AS client-build
WORKDIR /src/Client/MeliGo
COPY Client/MeliGo/package*.json ./
RUN npm ci
COPY Client/MeliGo/ ./
RUN npm run build -- --configuration production

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS server-build
WORKDIR /src
COPY Server/MeliGo/MeliGo.csproj Server/MeliGo/
RUN dotnet restore Server/MeliGo/MeliGo.csproj
COPY Server/MeliGo/ Server/MeliGo/
RUN dotnet publish Server/MeliGo/MeliGo.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
COPY --from=server-build /out .
COPY --from=client-build /src/Client/MeliGo/dist/meli-go/browser ./wwwroot
EXPOSE 10000
ENTRYPOINT ["dotnet", "MeliGo.dll"]
