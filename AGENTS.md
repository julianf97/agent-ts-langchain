# Contexto del proyecto

Agente de facturación autónomo para una demo ERP. Stack: TypeScript estricto, ES Modules, LangChain, OpenAI y node-cron. Interactúa exclusivamente con endpoints HTTP de api-agente como usuario regular.

## Criterios de implementación

- Mantener la estructura actual y escribir funciones pequeñas con nombres claros.
- Usar herramientas acotadas; no agregar clientes HTTP genéricos accesibles al modelo.
- Solo facturar documentos OV pendientes, validar de nuevo antes de emitir y conservar el límite por ejecución.
- La API determina importe, tipo fiscal y datos del cliente. El agente no los inventa.
- No acceder a PostgreSQL ni administrar usuarios desde el agente.
- No registrar tokens, contraseñas ni claves; no subir .env.
- Registrar acciones desde los resultados de las herramientas. El texto del modelo no prueba que se ejecutó una acción.
- No reintentar automáticamente emisiones con resultado incierto.
- Mantener DRY_RUN como primera prueba. Las llamadas al modelo consumen API incluso en simulación.
- Verificar cambios con npm run typecheck, npm run build y npm test.
- Los tests habituales deben ser offline; no hacer llamadas pagas a OpenAI sin instrucción explícita.
