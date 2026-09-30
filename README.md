# agent-ts-langchain

Agente con TypeScript, LangChain y OpenAI que se ejecuta mediante un cron y opera sobre [api-agente](https://github.com/julianf97/api-agente) a través de HTTP. Usa un usuario regular para consultar documentos y emitir facturas de órdenes de venta pendientes. No se conecta a PostgreSQL.

## Flujo

1. El cron inicia una ejecución con un contexto nuevo.
2. El modelo usa `list_documents`, que autentica contra la API y recorre todas las páginas antes de devolver los documentos.
3. El agente identifica los documentos con `type: "OV"` y `status: "pending"`.
4. Usa `create_invoice` para las órdenes elegibles. La herramienta vuelve a consultar cada documento y valida su tipo y estado antes de actuar.
5. La API calcula el tipo A/B/E, copia el importe y los datos fiscales y marca la orden como facturada.
6. El agente guarda un registro JSON de la ejecución en `logs/` y muestra el resultado en la terminal.

La herramienta solo permite facturar IDs del listado, una vez por ejecución y hasta el límite configurado. La numeración `DEMO-OV-{id}` es determinista y técnica para esta demo; no representa una numeración fiscal autorizada. Una misma orden no produce dos facturas gracias a las reglas transaccionales de la API. Los resultados de las herramientas, no el resumen del modelo, son la evidencia de las acciones realizadas.

## Requisitos

- Node.js 22 o posterior.
- `api-agente` actualizado y ejecutándose en local, normalmente en `http://127.0.0.1:3000`.
- Un usuario regular habilitado. Puede acceder a todas las órdenes, independientemente del dueño.
- Una clave de la API de OpenAI con saldo/cuota disponible. La suscripción a ChatGPT no incluye el consumo de la API.

## Instalar y configurar en Windows

```powershell
git clone https://github.com/julianf97/agent-ts-langchain.git
cd agent-ts-langchain
npm ci
Copy-Item .env.example .env
```

Editá `.env`:

```dotenv
OPENAI_API_KEY=tu_clave_de_api
OPENAI_MODEL=gpt-4.1-mini
API_BASE_URL=http://127.0.0.1:3000
API_EMAIL=regular@example.com
API_PASSWORD=contraseña_del_usuario_regular
DRY_RUN=true
```

La URL apunta al servidor Express. El puerto 5432/5433 de PostgreSQL no corresponde a esta configuración. Elegí otro modelo compatible con herramientas si no tenés acceso al modelo predeterminado. No subas `.env` ni claves al repositorio.

## Primera prueba local

Creá un cliente y algunas órdenes pendientes desde Swagger de `api-agente`. Podés incluir una orden cancelada y otra ya facturada para comprobar que se omiten. Actualmente esa API solo permite crear documentos de tipo OV; los tests HTTP también incluyen otros tipos para asegurar que el agente los rechace si la API se amplía.

Ejecutá una sola vez:

```powershell
npm run agent:once
```

Con `DRY_RUN=true` se hacen consultas y llamadas al modelo, pero no se envía `POST /invoices`. Los eventos de las órdenes seleccionadas quedan como `simulated`. La simulación también consume la API de OpenAI.

Cuando revises el registro, cambiá `DRY_RUN=false` y repetí `npm run agent:once`. Consultá documentos y facturas en Swagger: las órdenes procesadas deben quedar `invoiced`. Otra ejecución no debe volver a facturarlas.

## Ejecución programada

```powershell
npm run build
npm start
```

Por defecto se inicia una ejecución cada minuto; el programa espera al próximo disparo del cron. Para desarrollo, `npm run dev` vuelve a iniciar el proceso al cambiar el código. La terminal o el proceso deben permanecer abiertos para que el cron se ejecute. Detenelo con Ctrl+C; se dejan terminar las acciones en curso y no se programan nuevas.

| Variable               | Valor predeterminado             | Uso                                            |
| ---------------------- | -------------------------------- | ---------------------------------------------- |
| `CRON_EXPRESSION`      | `*/1 * * * *`                    | Frecuencia; acepta la sintaxis de node-cron    |
| `CRON_TIMEZONE`        | `America/Argentina/Buenos_Aires` | Zona horaria                                   |
| `DRY_RUN`              | `true`                           | Simulación sin emisión                         |
| `MAX_INVOICES_PER_RUN` | `10`                             | Máximo de órdenes intentadas; hasta 25         |
| `MAX_DOCUMENT_PAGES`   | `10`                             | Máximo de páginas de 100 documentos; hasta 100 |
| `API_TIMEOUT_MS`       | `15000`                          | Tiempo máximo por petición HTTP                |
| `RUN_TIMEOUT_MS`       | `180000`                         | Tiempo máximo de ejecución                     |
| `LOG_DIRECTORY`        | `logs`                           | Directorio de registros                        |

Si el listado supera `MAX_DOCUMENT_PAGES`, la ejecución falla antes de facturar. Si quedan órdenes elegibles por el límite o porque el modelo no las procesó, el registro queda `partial` con sus IDs; una ejecución posterior vuelve a consultarlas. No se promete que el modelo procese todos los documentos: el log muestra lo que realmente ocurrió.

Se evita la superposición dentro del mismo proceso. Ejecutá una sola instancia del cron en esta demo. Varias instancias necesitarían coordinación compartida; la API sigue evitando facturas duplicadas de una orden.

## Registros y errores

Cada archivo registra ID, fechas, modo, documentos consultados, resultados y órdenes pendientes de procesar. Los eventos pueden ser `created`, `simulated`, `skipped`, `error` o `uncertain`; el estado general puede ser `completed`, `partial` o `failed`.

Las credenciales y los tokens no se registran. Ante un 401, se renueva el token una vez. Un POST fallido por red o una respuesta ambigua no se reintenta automáticamente: puede haber sido confirmado en el servidor. Consultá el documento y las facturas antes de repetirlo. Los conflictos devueltos por la API quedan registrados.

El archivo inicial tiene estado `running`. Si el proceso se interrumpe abruptamente, ese estado puede permanecer y no confirma si una acción terminó: verificá la API. El registro final se escribe al terminar; esta versión no implementa una auditoría transaccional por operación. No hay tabla adicional de ejecuciones en `api-agente`.

## Estructura

- `src/config`: configuración y validación de entorno.
- `src/api`: cliente HTTP y contratos de respuestas.
- `src/agent`: modelo, instrucciones y herramientas de facturación.
- `src/jobs`: ejecución y control de superposición.
- `src/logging`: registros JSON.
- `src/index.ts`: inicio manual o mediante cron.
- `tests`: configuración, cliente HTTP, herramientas y flujo de LangChain con un modelo simulado.

## Verificación

```powershell
npm run typecheck
npm run build
npm test
```

Los tests no necesitan OpenAI, PostgreSQL ni una API externa. Usan un servidor HTTP temporal y un modelo programado para verificar autenticación, paginación, renovación de token, tool calling, controles de facturación, simulación y fallos de red. La prueba con el modelo real se hace después de configurar `.env`.

## Próxima etapa

Primero validamos el comportamiento en local. Luego prepararemos datos de demostración para el arranque de Docker en `api-agente`. Este repositorio no agrega semillas ni modifica esa base. RAG, Redis y MCP quedan para etapas posteriores.

Documentación: [LangChain JS](https://docs.langchain.com/oss/javascript/langchain/overview), [OpenAI](https://platform.openai.com/docs), [node-cron](https://nodecron.com/).
