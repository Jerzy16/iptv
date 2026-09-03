# One Dxd

Es una aplicación para televisión (webOS) donde se ofrecen distintos canales y proveedores de IPTV.

## Proveedores

La app soporta múltiples proveedores IPTV, cada uno con su propia forma de autenticación (ver `js/services/providers.js`):

- **one DxD** — proveedor gratuito. No requiere usuario ni contraseña (`requiresAuth: false`); al seleccionarlo se obtienen los canales directamente desde su lista M3U pública.
  - **Fiberplus** — proveedor privado (`requiresAuth: true`). La aplicación consulta el proxy IPTV definido en `js/services/providers.js`; el proxy es el único componente que contacta con el backend Xtream Codes y reescribe los manifiestos y segmentos HLS:

  ```
  http://localhost:3000/api/playlist?username=<usuario>&password=<contraseña>
  ```

  Sin usuario/contraseña válidos en esa URL, el servidor no devuelve canales. `type`/`output` son configurables por proveedor en `providers.js` (`m3uType`, `output`); Fiberplus usa `m3u`/`mpegts`, distinto del `m3u_plus`/`m3u8` por defecto.

  Para iniciar el proxy local:

  ```powershell
  cd proxy
  Copy-Item .env.example .env
  npm install
  npm start
  ```

  En producción, cambia `proxyBaseUrl` por la URL HTTPS pública del proxy. No se deben guardar credenciales en el servidor ni subir `.env` al repositorio.

## Flujo de acceso a un proveedor

1. Al tocar un proveedor en la pantalla de inicio (`App.openProvider`):
   - Si el proveedor **no** requiere autenticación, o si ya existe una sesión guardada localmente para ese proveedor, se navega directo a `#channels/:providerId`.
   - Si requiere autenticación y no hay sesión guardada, se navega a `#login/:providerId` para pedir usuario y contraseña.
2. **Pantalla de login** (`js/pages/login-page.js`): el logo/avatar mostrado se arma dinámicamente según el proveedor que se está ingresando (mismo criterio visual que las tarjetas de la pantalla de inicio, vía `ProviderCard.logoFor`), en vez de mostrar siempre el logo de one DxD. Al enviar el formulario se muestra el estado "Verificando credenciales..." mientras se valida el usuario/contraseña contra el proveedor (intentando obtener la lista de canales con esas credenciales). Si falla, se muestra un mensaje de error con opción de reintentar.
3. **Pantalla de canales** (`js/pages/channels-page.js`): en cuanto se selecciona un proveedor y mientras los canales todavía no están listos, se muestra un estado de carga a pantalla completa ("Obteniendo canales de *Nombre del proveedor*..."). Si el proveedor no tiene canales o falla la carga, se muestra un mensaje de error con acción para volver al inicio.

## Persistencia de sesión (localStorage)

Para evitar pedirle al usuario sus credenciales cada vez que entra a un proveedor con autenticación, `js/services/auth-service.js` guarda en `localStorage` (por proveedor) un objeto con:

```json
{
  "username": "...",
  "password": "...",
  "provider": "fiberplus"
}
```

bajo la llave `dxdtv_session_<providerId>`. Mientras esa sesión exista, la app entra directo a los canales sin volver a mostrar el formulario de login. La lista de canales obtenida también se cachea localmente (`dxdtv_channels_<providerId>`) para evitar refetch innecesario en cada visita.

## Estructura del proyecto

- `js/core/` — router (hash routing), store de estado central y manejo de teclado (control remoto/TV).
- `js/services/` — proveedores, autenticación, parseo M3U, fetch de listas IPTV y motor de video (HLS).
- `js/components/` — piezas de UI reutilizables (header, tarjetas de canal/proveedor, tabs de categoría, mensajes de estado, etc.).
- `js/pages/` — pantallas: splash, inicio, login, canales y reproductor.
- `css/` — variables, estilos base, componentes y páginas.
