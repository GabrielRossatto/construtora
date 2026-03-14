# Arquitetura do Sistema SaaS para Construtoras

## 1. Arquitetura geral da aplicação
- **Frontend**: React + TailwindCSS (SPA), autenticação JWT, consumo da API REST.
- **Backend**: Spring Boot (camadas `controllers/services/repositories/entities/dtos/security/config`), validações e regras de negócio.
- **Banco**: MySQL (modelo relacional normalizado com isolamento por `empresa_id`).
- **Armazenamento de arquivos**: S3/compatível (AWS S3, MinIO, etc.), sem persistência de binário no banco.
- **Auditoria**: tabela `audit_log` para rastreabilidade de ações críticas.
- **Containerização**: Docker + docker-compose para `frontend`, `backend`, `mysql`.

## 2. Estratégia multi-tenant
- Estratégia escolhida: **single database + shared schema + row-level isolation**.
- Cada tabela de domínio possui `empresa_id`.
- O `empresa_id` é extraído do JWT e propagado pelo `TenantContext`.
- Repositórios e serviços SEMPRE consultam por `empresa_id`.
- Bloqueio de acesso cruzado entre empresas por regra de serviço + filtro de segurança.

## 3. Modelagem completa do banco de dados

### empresa
- `id` (PK)
- `nome`
- `cnpj` (unique)
- `plano`
- `data_criacao`

### permission
- `id` (PK)
- `code` (unique) ex: `CREATE_USER`
- `description`

### role
- `id` (PK)
- `name` (unique): `ADMIN_MASTER`, `TIME_COMERCIAL`, `CORRETOR`
- `description`

### role_permission
- `role_id` (FK -> role.id)
- `permission_id` (FK -> permission.id)
- PK composta (`role_id`, `permission_id`)

### user_account
- `id` (PK)
- `empresa_id` (FK -> empresa.id)
- `nome`
- `email` (unique)
- `telefone`
- `senha_hash`
- `role_id` (FK -> role.id)
- `ativo`
- `data_criacao`
- `ultimo_login`

### empreendimento
- `id` (PK)
- `empresa_id` (FK -> empresa.id)
- `foto_perfil_url`
- `nome`
- `descricao`
- `data_criacao`

### empreendimento_arquivo
- `id` (PK)
- `empresa_id` (FK -> empresa.id)
- `empreendimento_id` (FK -> empreendimento.id)
- `url`
- `tipo`
- `tamanho_bytes`
- `data_upload`

### material
- `id` (PK)
- `empresa_id` (FK -> empresa.id)
- `empreendimento_id` (FK -> empreendimento.id, nullable)
- `titulo`
- `tipo_arquivo` ENUM(`PDF`,`IMAGEM`,`EXCEL`,`DOCUMENTO`)
- `arquivo_url`
- `descricao`
- `tamanho_bytes`
- `data_upload`

### campanha
- `id` (PK)
- `empresa_id` (FK -> empresa.id)
- `titulo`
- `descricao`
- `data_criacao`

### campanha_material
- `campanha_id` (FK -> campanha.id)
- `material_id` (FK -> material.id)
- PK composta (`campanha_id`, `material_id`)

### audit_log
- `id` (PK)
- `usuario_id` (FK -> user_account.id)
- `empresa_id` (FK -> empresa.id)
- `acao`
- `entidade`
- `entidade_id`
- `timestamp`
- `ip`

## 4. Entidades e relacionamentos
- Empresa 1:N Usuários
- Empresa 1:N Empreendimentos
- Empresa 1:N Materiais
- Empresa 1:N Campanhas
- Empreendimento 1:N EmpreendimentoArquivos
- Campanha N:N Materiais
- Role N:N Permission
- Role 1:N Usuários
- Usuário 1:N AuditLog

## 5. Estratégia de autenticação
- Login com `email + senha`.
- Senha com `BCrypt`.
- Emissão de JWT assinado (`HS256`) com claims:
  - `sub` (email)
  - `uid` (id do usuário)
  - `empresa_id`
  - `role`
  - `permissions` (lista)
- Validação do token por filtro Spring Security.
- Endpoints públicos: `/api/auth/login`, `/actuator/health`.

## 6. Sistema de roles e permissions (RBAC)

### Roles
- `ADMIN_MASTER`: acesso total e configuração de permissões.
- `TIME_COMERCIAL`: gestão comercial operacional.
- `CORRETOR`: acesso somente leitura.

### Permissions
- `CREATE_USER`, `VIEW_USER`
- `CREATE_ENTERPRISE`, `VIEW_ENTERPRISE`
- `CREATE_MATERIAL`, `VIEW_MATERIAL`
- `CREATE_CAMPAIGN`, `VIEW_CAMPAIGN`
- `CREATE_DEVELOPMENT`, `VIEW_DEVELOPMENT`
- `UPLOAD_FILE`

Controle em endpoints com `@PreAuthorize` validando permission no token/authorities.

## 7. API REST (v1)

### Auth
- `POST /api/auth/login`

### Empresas
- `POST /api/empresas` (bootstrap/admin)
- `GET /api/empresas/me`

### Usuários
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/{id}`

### Empreendimentos
- `POST /api/empreendimentos`
- `GET /api/empreendimentos`
- `PUT /api/empreendimentos/{id}`
- `POST /api/empreendimentos/{id}/arquivos` (upload)

### Materiais
- `POST /api/materiais` (upload + metadados)
- `GET /api/materiais`

### Campanhas
- `POST /api/campanhas`
- `GET /api/campanhas`

### Dashboard
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/recent-campaigns`

### Auditoria
- `GET /api/audit-logs`

## 8. Estrutura de pastas

### Backend
- `controllers/`
- `services/`
- `repositories/`
- `entities/`
- `dtos/`
- `security/`
- `config/`

### Frontend
- `pages/`
- `components/`
- `services/`
- `hooks/`
- `layouts/`

## 9. Fluxo de autenticação
1. Usuário envia credenciais em `/api/auth/login`.
2. Backend valida credenciais e status do usuário.
3. Backend retorna JWT + dados básicos.
4. Frontend persiste token (localStorage) e injeta em `Authorization: Bearer`.
5. Rotas protegidas validam token no backend.

## 10. Fluxo do dashboard
1. Frontend chama `/api/dashboard/metrics` e `/api/dashboard/recent-campaigns`.
2. Backend filtra por `empresa_id` do token.
3. Retorna indicadores e campanhas recentes da empresa.

## 11. Fluxo de upload de arquivos
1. Frontend envia `multipart/form-data` para endpoint de upload.
2. Backend valida tipo e tamanho.
3. Backend envia binário ao S3/compatível.
4. Backend grava somente metadados no MySQL (`url`, `tipo`, `tamanho`, `data_upload`).

## 12. Estratégia de auditoria
- Registro explícito por ação de negócio crítica.
- Campos: usuário, empresa, ação, entidade, entidade_id, IP, timestamp.
- Eventos obrigatórios:
  - criação de usuário
  - edição de empreendimento
  - upload de material
  - criação de campanha

## 13. Segurança e escalabilidade
- Senhas com BCrypt.
- JWT com expiração curta e assinatura forte.
- Validação de entrada (`jakarta.validation`).
- CORS restritivo via configuração.
- Isolamento multi-tenant em todas as consultas.
- Upload direto para storage escalável (S3).
- Serviços stateless, horizontalmente escaláveis.
