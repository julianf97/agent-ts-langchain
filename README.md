# agent-ts-langchain

Agente de facturación desarrollado con TypeScript, LangChain y OpenAI. Consulta órdenes de venta pendientes y solicita la creación de facturas mediante los endpoints de [api-agente](https://github.com/julianf97/api-agente).

## Qué hace el agente

1. Espera el horario configurado mediante `node-cron`.
2. Inicia sesión en la API como usuario regular y obtiene un token JWT.
3. Consulta los documentos paginados y lee el contexto y las reglas de negocio que devuelve la API.
4. Selecciona órdenes de venta con `type: OV` y `status: pending`.
5. Solicita una factura por orden, enviando únicamente `number` y `documentId`. Usa el número `DEMO-FAC-OV-{documentId}`.
6. La API calcula los datos fiscales y el importe, crea la factura y marca la orden como `invoiced`.
7. Imprime las llamadas a herramientas y un resumen en español con las facturas creadas.

El agente ejecuta automáticamente un lote según `BILLING_CRON`. `BILLING_BATCH_SIZE` define cuántas facturas solicita por ejecución. En cada lote inicia sesión y crea una nueva instancia del agente. Opera mediante HTTP; no se conecta directamente a PostgreSQL.

## Inicio rápido con Docker

Necesitás Git y Docker Desktop iniciado (o Docker Engine con Docker Compose). No necesitás instalar Node.js en tu computadora.

### 1. Crear la red y levantar la API

La API y el agente usan la red externa compartida `erp-agent-network`. Creala una sola vez:

```powershell
docker network create erp-agent-network
```

Si Docker informa que ya existe, continuá. Desde la carpeta del repositorio `api-agente`, actualizá `main`, configurá su `.env` siguiendo su README y levantá sus servicios:

```powershell
git pull origin main
docker compose up -d --build
docker compose logs -f api
```

Esperá a que la API termine las migraciones, el seed y el arranque. Comprobá [Swagger](http://localhost:3000/api-docs), ajustando el puerto si cambiaste `HOST_PORT`. Salí de los logs con `Ctrl+C`.

### 2. Configurar el agente

Desde la carpeta de este repositorio:

```powershell
git pull origin main
Copy-Item .env.example .env
```

Si todavía no lo clonaste, ejecutá primero `git clone https://github.com/julianf97/agent-ts-langchain.git` y `cd agent-ts-langchain`. Si ya tenés `.env`, conservá tus valores y agregá las variables que falten. En Linux o macOS usá `cp .env.example .env`.

Configurá tu propia `OPENAI_API_KEY`, el `OPENAI_MODEL`, las credenciales del usuario regular, el tamaño del lote y el cron. Por ejemplo, `BILLING_CRON=53 14 * * *` programa todos los días a las 14:53, hora argentina.

Compose configura automáticamente `API_BASE_URL=http://api-agente:3000` dentro del contenedor. El nombre `api-agente` es el alias de la API en la red compartida. El puerto interno sigue siendo 3000 aunque cambies `HOST_PORT`. Para ejecutar el agente localmente, el valor de `.env` sigue siendo `http://localhost:3000`.

### 3. Levantar y consultar los logs

```powershell
docker compose up -d --build
docker compose logs -f agent
```

La imagen compila TypeScript y ejecuta `dist/index.js` como usuario sin privilegios. Las credenciales se cargan al iniciar el contenedor; `.env` queda excluido de la imagen.

El agente espera el próximo horario del cron; **no factura inmediatamente al arrancar**. Docker Desktop, la computadora y la API deben seguir disponibles. Los dos proyectos tienen Compose separados: levantá primero la API, ya que el Compose del agente no espera automáticamente su disponibilidad.

Con `Ctrl+C` salís de los logs sin detener el agente. Después de cambiar `.env`, ejecutá:

```powershell
docker compose up -d --force-recreate agent
```

Después de cambiar el código, usá `docker compose up -d --build`. Para detener el agente:

```powershell
docker compose down
```

Ejecutá una sola instancia del agente y detené cualquier proceso local de `npm start` o `npm run dev` antes de arrancarlo en Docker. `noOverlap` solo coordina los lotes dentro de un mismo proceso.

Para comprobar la red:

```powershell
docker network inspect erp-agent-network
docker compose exec agent node -e "fetch('http://api-agente:3000/').then(async r => { console.log(r.status, await r.text()); if (!r.ok) process.exitCode = 1; }).catch(e => { console.error(e.message); process.exitCode = 1; })"
```

La red debe incluir ambos contenedores y la consulta debe devolver HTTP 200. Esta comprobación no ejecuta el agente ni crea facturas. PostgreSQL permanece en la red privada del Compose de la API.

## Inicio rápido sin Docker

Necesitás Git, Node.js 22 o posterior, npm y una API key de OpenAI con acceso a un modelo que admita llamadas a herramientas.

### 1. Levantar la API

Antes de continuar, seguí las instrucciones del repositorio [api-agente](https://github.com/julianf97/api-agente) para levantar la API, PostgreSQL y los datos de demo.

Comprobá que puedas acceder a [Swagger](http://localhost:3000/api-docs). Si cambiaste el puerto de la API, usá ese puerto en la URL.

### 2. Clonar e instalar

```powershell
git clone https://github.com/julianf97/agent-ts-langchain.git
cd agent-ts-langchain
npm ci
```

Ejecutá los siguientes pasos desde la carpeta `agent-ts-langchain`.

### 3. Configurar las variables de entorno

Creá un archivo `.env` en la raíz del proyecto y pegá estas ocho variables:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=identificador_del_modelo_que_vas_a_usar
API_BASE_URL=http://localhost:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
BILLING_CRON=53 14 * * *
BILLING_TIMEZONE=America/Argentina/Buenos_Aires
```

Reemplazá `OPENAI_API_KEY` por **tu propia API key de OpenAI** y `OPENAI_MODEL` por el identificador del modelo que vas a utilizar. Debe admitir llamadas a herramientas y estar disponible para tu cuenta. Las llamadas consumen el saldo o la facturación de tu cuenta de la API de OpenAI.

Si levantaste la API en la misma computadora con el puerto predeterminado, conservá `API_BASE_URL=http://localhost:3000`. Si cambiaste el puerto, ajustá la URL. Usá solamente la URL base, sin `/api-docs`, otros endpoints ni una barra final.

Conservá `API_EMAIL` y `API_PASSWORD` para usar el usuario regular de la demo. Si cambiaste su contraseña en una base existente, usá la contraseña actual: el seed no la restablece.

Elegí `BILLING_BATCH_SIZE` según cuántas facturas querés solicitar por ejecución. Debe ser un entero mayor que cero. Por ejemplo, para solicitar diez:

```env
BILLING_BATCH_SIZE=10
```

Configurá `BILLING_CRON` con el horario deseado. El ejemplo `53 14 * * *` ejecuta un lote **todos los días a las 14:53, hora argentina**, según `BILLING_TIMEZONE`. Cambiá la hora y los minutos para elegir otro horario.

No subas `.env` al repositorio. El agente obtiene su token iniciando sesión en la API; no necesita `JWT_SECRET` ni las credenciales de PostgreSQL.

### 4. Compilar y ejecutar

Con la API disponible y `.env` configurado:

```powershell
npm run build
npm start
```

La terminal muestra el cron y la zona horaria configurados. El proceso queda esperando la próxima ejecución; **no crea un lote inmediatamente al arrancar**.

Dejá la terminal abierta, la computadora encendida y la API disponible. Iniciá el proceso antes del horario elegido: si lo arrancás después de las 14:53 con la configuración del ejemplo, ejecutará el primer lote al día siguiente.

Al llegar el horario, inicia sesión, consulta las órdenes pendientes y solicita las facturas. En la terminal vas a ver las llamadas a herramientas y el resumen. Para detenerlo, usá `Ctrl+C`.

### 5. Comprobar las facturas creadas

Después de una ejecución programada, desde Swagger de `api-agente`, iniciá sesión con el usuario regular y autorizá las solicitudes con el token obtenido.

Consultá `GET /invoices` para ver las facturas creadas y `GET /documents` para comprobar que las órdenes procesadas tienen estado `invoiced`.

El siguiente lote se ejecuta automáticamente en el próximo horario del cron. Reiniciar el proceso vuelve a programar la tarea; no ejecuta un lote de inmediato.

Las órdenes ya facturadas no vuelven a ser elegibles. Para completar otro lote deben quedar suficientes OV pendientes.

## Documentación y referencia

### Variables de entorno

| Variable | Descripción |
| --- | --- |
| `OPENAI_API_KEY` | Tu propia API key de OpenAI. |
| `OPENAI_MODEL` | Identificador del modelo de OpenAI con soporte para herramientas. |
| `API_BASE_URL` | URL base de la API accesible desde la computadora que ejecuta el agente. |
| `API_EMAIL` | Email del usuario regular de la demo: `regular@example.com`. |
| `API_PASSWORD` | Contraseña inicial: `RegularDemo123!`. Si la cambiaste, usá la actual. |
| `BILLING_BATCH_SIZE` | Cantidad de facturas solicitadas por ejecución; entero mayor que cero. |
| `BILLING_CRON` | Expresión cron que define cuándo ejecutar cada lote. Por defecto: `*/5 * * * *`. |
| `BILLING_TIMEZONE` | Zona horaria para interpretar el cron. Por defecto: `America/Argentina/Buenos_Aires`. |

### Programación del cron

| `BILLING_CRON` | Frecuencia |
| --- | --- |
| `00 16 * * *` | Todos los días a las 16:00. | 
| `0 9 * * *` | Todos los días a las 9:00. |
| `* * * * *` | Cada minuto, al comenzar el minuto. |
| `*/5 * * * *` | Cada cinco minutos. |
| `0 * * * *` | Cada hora, en el minuto 00. |

Para probar sin esperar al horario diario, configurá temporalmente:

```env
BILLING_CRON=* * * * *
BILLING_BATCH_SIZE=2
```

Guardá `.env` y reiniciá el proceso con `Ctrl+C` y `npm start`. Esperá el próximo cambio de minuto y comprobá las facturas desde Swagger. Después restaurá la frecuencia deseada y reiniciá nuevamente.

`noOverlap: true` evita iniciar otro lote si el anterior sigue en ejecución dentro del mismo proceso; ese horario se omite. Ejecutá una sola instancia para la demo, porque esta opción no coordina procesos distintos.

Si un lote lanza un error, se registra en la terminal y el proceso sigue esperando la próxima ejecución. Cada ejecución realiza nuevas llamadas a OpenAI.

### API en otra computadora

Si la API está en otra computadora accesible por red, configurá su IP y puerto:

```env
API_BASE_URL=http://192.168.1.100:3000
```

Reemplazá la IP y el puerto por los reales. El Compose de `api-agente` publica los puertos en `127.0.0.1` de forma predeterminada. Para acceder desde otra computadora, configurá también la publicación del puerto y el acceso de red; cambiar solamente esta URL no habilita el acceso remoto.

### Herramientas

| Herramienta | Operación sobre la API |
| --- | --- |
| `list_documents` | Consulta `GET /documents?page={page}&limit=100` y devuelve documentos, paginación y contexto. |
| `create_invoice` | Envía `POST /invoices` con `number` y `documentId`; devuelve el resultado y, si tiene éxito, los lugares restantes del lote. |

El agente recibe instrucciones de continuar hasta completar el lote, agotar las órdenes elegibles o encontrar un error de creación. La herramienta limita los intentos y evita repetir una orden dentro de la ejecución. Actualmente no hay una comprobación externa que obligue al modelo a completar el lote si responde antes de tiempo.

Las reglas fiscales y la prevención de facturas duplicadas por orden se aplican en `api-agente`. Las facturas de esta demo no tienen autorización fiscal de ARCA.

### Comandos de desarrollo

```powershell
npm run dev
```

Usa `tsx watch` y reinicia el proceso cuando cambia el código fuente. Cada reinicio vuelve a programar el cron y espera el próximo horario; no crea un lote inmediatamente. Después de cambiar `.env`, reiniciá el proceso para cargar los nuevos valores.

```powershell
npm run build
npm start
```

`npm run build` compila TypeScript en `dist/`; `npm start` ejecuta `dist/index.js`. Después de modificar el código fuente, compilá nuevamente antes de usar `npm start`.
