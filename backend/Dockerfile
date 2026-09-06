FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /backend

COPY ["backend.csproj", "."] 
RUN dotnet restore 'backend.csproj'

COPY [".", "."]
RUN dotnet publish 'backend.csproj' -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "backend.dll"]