# Construtora SaaS - Multi-tenant (Commercial HUB)

Aplicação web SaaS para construtoras com backend Spring Boot + frontend React/Tailwind, incluindo multiempresa, RBAC, auditoria e upload em storage S3/compatível.

## Estrutura
- `docs/layout.pdf`: referência visual das telas
- `docs/architecture.md`: arquitetura completa (FASE 1)
- `backend/`: API Spring Boot
- `frontend/`: SPA React + Tailwind
- `docker/`: orquestração Docker

## Backend
Tecnologias:
- Java 21
- Spring Boot
- Maven
- MySQL
- JWT
- RBAC

Camadas implementadas:
- `controllers`
- `services`
- `repositories`
- `entities`
- `dtos`
- `security`
- `config`

Funcionalidades:
- Auth JWT (`/api/auth/login`)
- Multi-tenant por `empresa_id`
- RBAC por roles e permissions
- Auditoria (`audit_log`)
- Upload de arquivos com S3 (somente metadados no banco)

## Frontend
Tecnologias:
- React
- TailwindCSS
- React Router

Estrutura:
- `src/pages`
- `src/components`
- `src/services`
- `src/hooks`
- `src/layouts`

Telas implementadas:
- Login
- Dashboard
- Empreendimentos
- Cadastros (materiais)
- Institucional
- Gerenciamento de usuários

## Multi-tenant
Entidade `empresa` criada com:
- `id`
- `nome`
- `cnpj`
- `plano`
- `data_criacao`

Entidades isoladas por `empresa_id`:
- usuários
- empreendimentos
- materiais
- institucional

## Docker
Arquivos criados:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker/docker-compose.yml`
- `docker/docker-compose.test.yml`
- `docker/docker-compose.prod.yml`

Serviços no compose:
- `mysql`
- `backend`
- `frontend`

## Execução local (sem Docker)
### Backend
```bash
cd backend
mvn spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Execução com Docker
```bash
cd docker
docker compose up --build
```

Frontend: `http://localhost:8081`
Backend: `http://localhost:8080`

## Ambiente de teste local
```bash
cd docker
docker compose -f docker-compose.test.yml up --build
```

Serviços do ambiente de teste:
- Frontend: `http://localhost:18081`
- Backend: `http://localhost:18080`
- MinIO API: `http://localhost:19000`
- MinIO Console: `http://localhost:19001`

O ambiente de teste usa portas, banco e volumes separados da stack principal para evitar impacto no ambiente local padrão.

## Produção
1. Copie o arquivo de exemplo:
```bash
cd docker
cp .env.production.example .env.production
```
2. Preencha as variáveis com seus valores reais, principalmente:
- `JWT_SECRET`
- `DB_PASSWORD`
- `S3_*`
- `ALLOWED_ORIGINS`
3. Suba a stack de produção:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Observações de produção:
- o frontend é servido por `nginx`, não por `vite dev`
- a API é acessada por proxy em `/api`
- o banco usa `Flyway` para migrations
- os arquivos continuam fora do banco, em storage S3/compatível

## Observações de segurança
- Senha com BCrypt
- JWT com expiração
- Endpoints protegidos por permission
- Isolamento multi-tenant no serviço e repositório
- Arquivos persistidos fora do servidor de aplicação
