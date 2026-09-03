# Iptvdizzgo

Aplicación Angular para TV IPTV migrada desde el cliente nativo HTML/CSS/JS.
Incluye selección de proveedor, login por proveedor, persistencia de sesión y
playlist M3U, navegación home y reproducción de canales.

## Development server

To start a local development server, run:

```bash
npm.cmd start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

La playlist de Fiberplus usa el proxy incluido en `../code-base-iptv/proxy`.
Debe estar activo en `http://localhost:3000`; para producción se recomienda
publicarlo detrás de HTTPS y configurar `proxyBaseUrl` en
`src/app/services/providers.ts`.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
