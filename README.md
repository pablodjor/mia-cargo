# Miacargo Logística V1

Demo frontend de operación logística interna para Miacargo.

## Stack

- React + Vite + TypeScript (strict)
- Tailwind CSS
- React Router
- Lucide React, Sonner, React Hook Form, Zod, date-fns

Sin backend, sin APIs externas y sin autenticación real. Todo corre con mocks y `localStorage`.

## Cómo ejecutar

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
npm run preview
```

## Accesos demo

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@miacargo.com.ar | demo123 |
| Operador | operador@miacargo.com.ar | demo123 |
| Chofer | chofer@miacargo.com.ar | demo123 |

También hay botones de acceso rápido en `/login`.

## Funcionalidades

- Dashboard operativo con métricas calculadas
- Escáner de códigos SH / barras
- CRUD de paquetes, repartos, choferes y vehículos
- Vista mobile-first del chofer (entregas / no entregas)
- Incidencias, historial y configuración local
- Design System en `/design-system`
- Persistencia en `localStorage` con versión `MOCK_DATABASE_VERSION = 1`
