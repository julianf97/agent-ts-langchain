# agent-ts-langchain

Base mínima de Node.js con TypeScript y ES Modules. Requiere Node.js 22 o posterior.

## Instalar y ejecutar

```powershell
npm ci
npm run dev
```

El punto de entrada es `src/index.ts`. Por ahora muestra un mensaje en la terminal. `tsx watch` vuelve a ejecutarlo cuando cambia el código.

## Compilar y ejecutar JavaScript

```powershell
npm run build
npm start
```

TypeScript compila los archivos de `src/` a JavaScript en `dist/`. Node.js ejecuta `dist/index.js`.

## Archivos

- `package.json`: datos del proyecto, comandos y dependencias de desarrollo.
- `package-lock.json`: versiones concretas de las dependencias.
- `tsconfig.json`: configuración del compilador de TypeScript.
- `src/index.ts`: inicio del programa.
- `.gitignore`: archivos que no se suben a Git.

Construiremos el agente paso a paso sobre esta base.
