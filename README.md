# agent-ts-langchain

Agente de facturación desarrollado con TypeScript, LangChain y OpenAI para automatizar acciones sobre el ERP de demostración [api-agente](https://github.com/julianf97/api-agente). Opera mediante endpoints HTTP, sin conectarse directamente a PostgreSQL.

## Qué hace el agente

- Se ejecuta automáticamente en el horario y la zona horaria configurados mediante cron, sin que tengas que enviarle una solicitud en cada ejecución.
- Inicia sesión en la API con el usuario regular configurado.
- Consulta los documentos por páginas y lee el contexto y las reglas de negocio que devuelve la API.
- Selecciona únicamente órdenes de venta (`OV`) con estado `pending`.
- Crea las facturas una por una, con el objetivo de completar la cantidad configurada en `BILLING_BATCH_SIZE`. Usa el número `DEMO-FAC-OV-{documentId}` para cada factura.
- Delega en la API el cálculo de los datos de facturación y el cambio de la orden a `invoiced`. La API impide generar más de una factura para la misma orden.
- Muestra en los logs las llamadas a herramientas y un resumen de las facturas creadas. Si no hay suficientes órdenes elegibles o falla una creación, informa el motivo y la cantidad creada.

**Al arrancar, espera el próximo horario del cron.** Cada ejecución procesa un lote; las órdenes pendientes restantes quedan disponibles para las siguientes ejecuciones.

## Levantar con Docker

Necesitás Git y Docker Desktop iniciado (o Docker Engine con Docker Compose), y una API key de OpenAI con saldo disponible. Ambos repositorios deben ejecutarse en el mismo Docker Engine.

### 1. Levantar la API

Primero configurá y levantá [api-agente](https://github.com/julianf97/api-agente) siguiendo su README. Si ya lo tenés clonado, ejecutá desde su carpeta:

```powershell
docker compose up -d --build
docker compose logs -f api
```

Al levantar `api-agente`, Docker Compose crea automáticamente la red compartida `erp-agent-network`. El agente está configurado para conectarse a esa red existente; no necesitás crearla manualmente.

Esperá a que terminen las migraciones, el seed y el arranque. Comprobá [Swagger](http://localhost:3000/api-docs); si cambiaste `HOST_PORT`, usá ese puerto. Con `Ctrl+C` salís de los logs sin detener los contenedores.

### 2. Clonar el agente

```powershell
git clone https://github.com/julianf97/agent-ts-langchain.git
cd agent-ts-langchain
```

Si ya lo tenés clonado, ejecutá `git pull origin main` desde su carpeta. Todos los comandos siguientes se ejecutan dentro de `agent-ts-langchain`.

### 3. Configurar el entorno

Si todavía no tenés `.env`, crealo:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS usá `cp .env.example .env`. Si ya existe, conservá tus valores y agregá las variables que falten.

Configurá estas variables en `.env`:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=identificador_del_modelo_que_vas_a_usar // Example: gpt-4.1-mini
API_BASE_URL=http://api-agente:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
BILLING_CRON=00 18 * * *
BILLING_TIMEZONE=America/Argentina/Buenos_Aires
```

Reemplazá `OPENAI_API_KEY` por tu propia key y `OPENAI_MODEL` por un modelo disponible para tu cuenta que admita llamadas a herramientas. Las ejecuciones consumen la facturación de tu cuenta de la API de OpenAI.

Las credenciales corresponden al usuario regular del seed de la API. Si cambiaste su contraseña, usá la actual.

`BILLING_BATCH_SIZE` debe ser un entero mayor que cero. `BILLING_CRON=00 18 * * *` ejecuta un lote todos los días a las **18:00, hora argentina**. Cambiá los minutos y la hora para elegir otro horario.

Compose establece automáticamente `API_BASE_URL=http://api-agente:3000` dentro del contenedor, incluso si tu `.env` tiene otro valor. Ambos proyectos se comunican por `erp-agent-network`; el puerto interno de la API sigue siendo 3000 aunque cambies `HOST_PORT`.

No subas `.env` al repositorio.

### 4. Levantar el agente

Con `api-agente` ya levantado y la red `erp-agent-network` creada, ejecutá:

```powershell
docker compose up -d --build
docker compose logs -f agent
```

**El agente espera el próximo horario del cron; no factura inmediatamente al arrancar.** Si el horario del día ya pasó, con el ejemplo ejecutará el primer lote al día siguiente.

Dejá la computadora encendida, Docker en funcionamiento y la API disponible. Ejecutá una sola instancia del agente.

Con `Ctrl+C` salís de los logs sin detener el contenedor.

### 5. Comprobar el resultado

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

### 6. Endpoints que usa el agente

En cada ejecución programada, el proceso inicia sesión y entrega el token al agente. Luego, el agente usa sus herramientas para consultar documentos y crear facturas.

| Método | Endpoint | Cómo lo usa |
| --- | --- | --- |
| POST | `/auth/login` | Al iniciar cada lote, envía `email` y `password` desde `API_EMAIL` y `API_PASSWORD`. Obtiene el `accessToken` para autenticar las siguientes solicitudes. |
| GET | `/documents?page={page}&limit=100` | La herramienta `list_documents` consulta hasta 100 documentos por página, comenzando por la página 1. El agente lee el contexto y las reglas de la respuesta, selecciona documentos `type: OV` y `status: pending`, y consulta las páginas siguientes cuando necesita más órdenes. |
| POST | `/invoices` | La herramienta `create_invoice` envía `number: DEMO-FAC-OV-{documentId}` y `documentId` para crear una factura desde una OV pendiente. Procesa las órdenes una por una hasta completar el lote, agotar las candidatas o encontrar un error de creación. La API calcula los datos de la factura y cambia la orden a `invoiced`. |

Las solicitudes a `/documents` y `/invoices` incluyen el encabezado `Authorization: Bearer <accessToken>`. Las rutas se agregan a `API_BASE_URL`.

El cambio de estado de la orden ocurre dentro de `POST /invoices`; el agente no envía un PATCH adicional. `GET /invoices`, mencionado en la sección anterior, lo usás desde Swagger para comprobar el resultado; el agente no lo llama en el flujo actual.

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
