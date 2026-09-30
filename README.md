# agent-ts-langchain

Agente de facturación desarrollado con TypeScript, LangChain y OpenAI. Consulta órdenes de venta pendientes y solicita la creación de facturas mediante los endpoints de [api-agente](https://github.com/julianf97/api-agente).

## Qué hace el agente

1. Inicia sesión en la API como usuario regular y obtiene un token JWT.
2. Consulta los documentos paginados y lee el contexto y las reglas de negocio que devuelve la API.
3. Selecciona órdenes de venta con `type: OV` y `status: pending`.
4. Solicita una factura por orden, enviando únicamente `number` y `documentId`. Usa el número `DEMO-FAC-OV-{documentId}`.
5. La API calcula los datos fiscales y el importe, crea la factura y marca la orden como `invoiced`.
6. Imprime las llamadas a herramientas y un resumen en español con las facturas creadas.

Cada ejecución procesa un lote del tamaño configurado. Actualmente no hay un cron ni una programación automática. El agente opera mediante HTTP; no se conecta directamente a PostgreSQL.

## Inicio rápido

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

Creá un archivo `.env` en la raíz del proyecto y pegá estas seis variables:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=identificador_del_modelo_que_vas_a_usar
API_BASE_URL=http://localhost:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
```

Reemplazá `OPENAI_API_KEY` por **tu propia API key de OpenAI** y `OPENAI_MODEL` por el identificador del modelo que vas a utilizar. Debe admitir llamadas a herramientas y estar disponible para tu cuenta. Las llamadas consumen el saldo o la facturación de tu cuenta de la API de OpenAI.

Si levantaste la API en la misma computadora con el puerto predeterminado, conservá `API_BASE_URL=http://localhost:3000`. Si cambiaste el puerto, ajustá la URL. Usá solamente la URL base, sin `/api-docs`, otros endpoints ni una barra final.

Conservá `API_EMAIL` y `API_PASSWORD` para usar el usuario regular de la demo. Si cambiaste su contraseña en una base existente, usá la contraseña actual: el seed no la restablece.

Elegí `BILLING_BATCH_SIZE` según cuántas facturas querés solicitar por ejecución. Debe ser un entero mayor que cero. Por ejemplo, para solicitar diez:

```env
BILLING_BATCH_SIZE=10
```

No subas `.env` al repositorio. El agente obtiene su token iniciando sesión en la API; no necesita `JWT_SECRET` ni las credenciales de PostgreSQL.

### 4. Compilar y ejecutar

Con la API disponible y `.env` configurado:

```powershell
npm run build
npm start
```

El agente inicia sesión, consulta las órdenes pendientes y solicita las facturas del lote. En la terminal vas a ver las llamadas a herramientas y el resumen de la ejecución.

### 5. Comprobar las facturas creadas

Desde Swagger de `api-agente`, iniciá sesión con el usuario regular y autorizá las solicitudes con el token obtenido.

Consultá `GET /invoices` para ver las facturas creadas y `GET /documents` para comprobar que las órdenes procesadas tienen estado `invoiced`.

Para ejecutar otro lote:

```powershell
npm start
```

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

Usa `tsx watch` y vuelve a ejecutar el agente cuando cambia el código. Cada nueva ejecución puede crear otro lote de facturas en la base de demo.

```powershell
npm run build
npm start
```

`npm run build` compila TypeScript en `dist/`; `npm start` ejecuta `dist/index.js`. Después de modificar el código fuente, compilá nuevamente antes de usar `npm start`.
