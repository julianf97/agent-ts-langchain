# agent-ts-langchain

## Levantar con Docker

Necesitás Git y Docker Desktop iniciado (o Docker Engine con Docker Compose), y una API key de OpenAI con saldo disponible. Ambos repositorios deben ejecutarse en el mismo Docker Engine.

### 1. Crear la red compartida

Ejecutá una sola vez:

```powershell
docker network create erp-agent-network
```

Si Docker informa que la red ya existe, continuá.

### 2. Levantar la API

Primero configurá y levantá [api-agente](https://github.com/julianf97/api-agente) siguiendo su README. Si ya lo tenés clonado, ejecutá desde su carpeta:

```powershell
git pull origin main
docker compose up -d --build
docker compose logs -f api
```

Esperá a que terminen las migraciones, el seed y el arranque. Comprobá [Swagger](http://localhost:3000/api-docs); si cambiaste `HOST_PORT`, usá ese puerto. Con `Ctrl+C` salís de los logs sin detener los contenedores.

### 3. Clonar el agente

```powershell
git clone https://github.com/julianf97/agent-ts-langchain.git
cd agent-ts-langchain
```

Si ya lo tenés clonado, ejecutá `git pull origin main` desde su carpeta. Todos los comandos siguientes se ejecutan dentro de `agent-ts-langchain`.

### 4. Configurar el entorno

Si todavía no tenés `.env`, crealo:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS usá `cp .env.example .env`. Si ya existe, conservá tus valores y agregá las variables que falten.

Configurá estas variables en `.env`:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=identificador_del_modelo_que_vas_a_usar
API_BASE_URL=http://api-agente:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
BILLING_CRON=53 14 * * *
BILLING_TIMEZONE=America/Argentina/Buenos_Aires
```

Reemplazá `OPENAI_API_KEY` por tu propia key y `OPENAI_MODEL` por un modelo disponible para tu cuenta que admita llamadas a herramientas. Las ejecuciones consumen la facturación de tu cuenta de la API de OpenAI.

Las credenciales corresponden al usuario regular del seed de la API. Si cambiaste su contraseña, usá la actual.

`BILLING_BATCH_SIZE` debe ser un entero mayor que cero. `BILLING_CRON=53 14 * * *` ejecuta un lote todos los días a las **14:53, hora argentina**. Cambiá los minutos y la hora para elegir otro horario.

Compose establece automáticamente `API_BASE_URL=http://api-agente:3000` dentro del contenedor, incluso si tu `.env` tiene otro valor. Ambos proyectos se comunican por `erp-agent-network`; el puerto interno de la API sigue siendo 3000 aunque cambies `HOST_PORT`.

No subas `.env` al repositorio.

### 5. Levantar el agente

```powershell
docker compose up -d --build
docker compose logs -f agent
```

**El agente espera el próximo horario del cron; no factura inmediatamente al arrancar.** Si el horario del día ya pasó, con el ejemplo ejecutará el primer lote al día siguiente.

Dejá la computadora encendida, Docker en funcionamiento y la API disponible. Ejecutá una sola instancia del agente.

Con `Ctrl+C` salís de los logs sin detener el contenedor.

### 6. Comprobar el resultado

Después de la ejecución programada, iniciá sesión en Swagger con el usuario regular y autorizá las solicitudes con el token obtenido.

Consultá `GET /invoices` para ver las facturas creadas y `GET /documents` para comprobar que las OV procesadas tienen estado `invoiced`.

Para probar al próximo cambio de minuto, configurá temporalmente en `.env`:

```env
BILLING_CRON=* * * * *
BILLING_BATCH_SIZE=2
```

Aplicá los cambios:

```powershell
docker compose up -d --force-recreate agent
```

Después de probar, restaurá el horario deseado y ejecutá nuevamente ese comando.

### 7. Actualizar o detener

Después de cambiar `.env`:

```powershell
docker compose up -d --force-recreate agent
```

Para descargar cambios del repositorio y reconstruir:

```powershell
git pull origin main
docker compose up -d --build
```

Para consultar el estado y los logs:

```powershell
docker compose ps
docker compose logs -f agent
```

Para detener el agente:

```powershell
docker compose down
```

La API se administra desde su propio repositorio.
