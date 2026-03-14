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
- Campanhas
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
- campanhas

## Docker
Arquivos criados:
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker/docker-compose.yml`

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

## Observações de segurança
- Senha com BCrypt
- JWT com expiração
- Endpoints protegidos por permission
- Isolamento multi-tenant no serviço e repositório
- Arquivos persistidos fora do servidor de aplicação
