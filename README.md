# agent-ts-langchain

**Antes de ejecutar el agente, tenés que tener levantado el repositorio [api-agente](https://github.com/julianf97/api-agente) en tu entorno local, con su base de datos y los registros de demo cargados.** Seguí el README de esa API para configurar `.env` y ejecutar `docker compose up -d --build`.

Agente de facturación desarrollado con TypeScript, LangChain y OpenAI. Opera sobre la API de un ERP de demostración mediante endpoints HTTP; no se conecta directamente a PostgreSQL.

## Cómo configurarlo

1. Levantá `api-agente` y comprobá que puedas acceder a su Swagger en `/api-docs`.
2. Cloná este repositorio e instalá sus dependencias con Node.js 22 o posterior.
3. Creá un archivo `.env` en la raíz de este proyecto.
4. Configurá `OPENAI_API_KEY` con **tu propia API key de OpenAI** y `OPENAI_MODEL` con el identificador del modelo que vas a utilizar. El modelo debe admitir llamadas a herramientas y estar disponible para tu cuenta. Las llamadas consumen el saldo o la facturación de tu cuenta de la API de OpenAI.
5. Configurá `API_BASE_URL` según la IP o el host y el puerto donde tengas levantada la API, accesibles desde la computadora que ejecuta el agente.
6. Usá las credenciales de demo indicadas abajo para que el agente opere como usuario **regular**.
7. Elegí `BILLING_BATCH_SIZE` según cuántas facturas querés que el agente cree en cada ejecución.
8. Compilá el proyecto y ejecutá el agente.

## Qué hace el agente

1. Inicia sesión en la API con el usuario regular y obtiene un token JWT.
2. Configura el modelo de OpenAI, las herramientas y las instrucciones de facturación con el tamaño del lote elegido.
3. Consulta los documentos mediante `list_documents`, empezando por la página 1, y lee el contexto y las reglas de negocio devueltos por la API.
4. Selecciona documentos con `type: OV` y `status: pending`.
5. Solicita la creación de una factura por orden mediante `create_invoice`, enviando únicamente `number` y `documentId`. El número sigue el formato `DEMO-FAC-OV-{documentId}`.
6. La API calcula el tipo de factura y sus datos fiscales, toma el importe de la orden, crea la factura y marca la OV como `invoiced`.
7. El agente recibe instrucciones de continuar automáticamente hasta completar el lote, agotar las órdenes elegibles o encontrar un error de creación. La herramienta impide superar el límite configurado y repetir una orden dentro de la ejecución.
8. Imprime en la terminal las llamadas a herramientas y un resumen en español con las facturas creadas.

Cada inicio ejecuta un lote. Actualmente no hay un cron ni una programación automática de ejecuciones.

## Instalar

Requisitos: Git, Node.js 22 o posterior, npm, acceso a la API levantada y una API key de OpenAI con acceso al modelo configurado.

```powershell
git clone https://github.com/julianf97/agent-ts-langchain.git
cd agent-ts-langchain
npm ci
```

## Variables de entorno

Creá `.env` en la raíz y configurá las **seis variables**:

```env
OPENAI_API_KEY=tu_api_key_de_openai
OPENAI_MODEL=identificador_del_modelo_que_vas_a_usar
API_BASE_URL=http://localhost:3000
API_EMAIL=regular@example.com
API_PASSWORD=RegularDemo123!
BILLING_BATCH_SIZE=5
```

Los valores de OpenAI son marcadores: reemplazalos por tu clave real y el identificador de tu modelo antes de ejecutar.

| Variable | Cómo configurarla |
| --- | --- |
| `OPENAI_API_KEY` | Tu propia API key de OpenAI. No se incluye una clave compartida en el proyecto. |
| `OPENAI_MODEL` | Identificador del modelo de OpenAI que elegís para probar el agente. Debe admitir herramientas. |
| `API_BASE_URL` | URL base de tu API, con protocolo, IP o host y puerto. No agregues `/api-docs`, `/auth/login` ni otros endpoints; evitá la barra final. |
| `API_EMAIL` | Mantené `regular@example.com`, correspondiente al usuario regular de la demo. |
| `API_PASSWORD` | Mantené `RegularDemo123!`, contraseña inicial de ese usuario de demo. |
| `BILLING_BATCH_SIZE` | Cantidad de facturas que querés crear por ejecución. Elegí un entero mayor que cero; `5` es un ejemplo. |

### URL de la API

Si ejecutás el agente en la misma computadora donde publicaste la API con el puerto predeterminado de Docker:

```env
API_BASE_URL=http://localhost:3000
```

Si la API está en otra computadora accesible por red, usá su IP y puerto; por ejemplo:

```env
API_BASE_URL=http://192.168.1.100:3000
```

Reemplazá esa IP por la real. El Compose de `api-agente` publica los puertos en `127.0.0.1` de forma predeterminada: para acceder desde otra computadora, primero debés configurar la publicación del puerto y el acceso de red correspondientes. Cambiar solamente esta URL no habilita el acceso remoto.

### Tamaño del lote

**Vos elegís el lote según cuántas facturas querés que el agente haga.** Por ejemplo, para solicitar diez facturas por ejecución:

```env
BILLING_BATCH_SIZE=10
```

El objetivo requiere suficientes OV pendientes. Si ya se facturaron, esas órdenes no vuelven a ser elegibles. El tamaño se comunica al modelo mediante las instrucciones y también limita los intentos de la herramienta; actualmente no hay una comprobación externa que obligue al modelo a completar el lote si responde antes de tiempo.

La demo crea el usuario regular con las credenciales indicadas. Si reutilizás una base donde cambiaste su contraseña, el seed no la restablece: asegurate de que la cuenta conserve las credenciales de demo para seguir estos pasos.

`.env` está excluido de Git. El agente no necesita `JWT_SECRET` ni las credenciales de PostgreSQL: obtiene su token iniciando sesión en la API.

## Compilar y ejecutar

Con la API disponible y `.env` configurado:

```powershell
npm run build
npm start
```

`npm run build` compila TypeScript en `dist/`; `npm start` ejecuta `dist/index.js`. Después de modificar el código fuente, compilá nuevamente antes de usar `npm start`.

Para desarrollo:

```powershell
npm run dev
```

Este comando usa `tsx watch`: vuelve a ejecutar el agente cuando cambia el código. Cada nueva ejecución puede crear otro lote de facturas en la base de demo.

## Herramientas

| Herramienta | Operación sobre la API |
| --- | --- |
| `list_documents` | Consulta `GET /documents?page={page}&limit=100` y devuelve documentos, paginación y contexto. |
| `create_invoice` | Envía `POST /invoices` con `number` y `documentId`; devuelve el resultado y, si tiene éxito, los lugares restantes del lote. |

Las reglas fiscales y la prevención de facturas duplicadas por orden se aplican en `api-agente`. Las facturas de esta demo no tienen autorización fiscal de ARCA.
