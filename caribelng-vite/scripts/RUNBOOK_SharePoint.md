# Conecta — Migración de almacenamiento de OneDrive a SharePoint

Antes: Conecta subía los archivos a la OneDrive personal de `diana.silva@caribelng.com`.
Ahora: sube al sitio de SharePoint de la empresa
`https://course2.sharepoint.com/sites/CaribeLNG` → biblioteca **Documentos** → carpeta `Conecta/`,
conservando la misma estructura (Evidencias, Reportes, Registros, Actas, Ambiental, por territorio y mes).

## Qué cambió en el código
- Nuevo endpoint: `api/upload-sharepoint.js` (escribe al sitio de SharePoint).
- `api/upload-onedrive.js` se conserva tal cual como respaldo / rollback (ya no se llama).
- Frontend ahora llama a `/api/upload-sharepoint` (en `src/lib/supabase.js` y `src/components/AmbientalView.jsx`).

## Paso 1 — Permiso de Azure (una sola vez, lo hace un admin)
En el registro de Azure que ya usa la app (`AZURE_CLIENT_ID`):
1. API permissions → Add → Microsoft Graph → **Application permissions**.
2. Agregar **`Sites.ReadWrite.All`** (y, para la migración, **`Files.Read.All`**).
3. **Grant admin consent**.
> Con solo `Files.ReadWrite.All` (lo que usaba la versión OneDrive) NO se puede escribir en un sitio de SharePoint.

## Paso 2 — Variables de entorno en Vercel
Ya existen: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.
Opcionales (tienen default en el código, agréguelas solo si el sitio cambia):
- `SHAREPOINT_HOST` = `course2.sharepoint.com`
- `SHAREPOINT_SITE_PATH` = `/sites/CaribeLNG`

## Paso 3 — Desplegar
Desde `_INTRANET_APP/03 Conecta/caribelng-vite/`:
```
vercel --prod
```
(o push a la rama conectada a Vercel). Luego probar una subida real desde la app y confirmar
que el archivo aparece en SharePoint → Documentos → Conecta.

## Paso 4 — Migrar lo ya subido (una sola vez)
Con las credenciales de Azure en el entorno (las mismas de Vercel):
```
# Primero en seco, para ver qué se va a copiar sin escribir nada:
DRY_RUN=1 AZURE_TENANT_ID=... AZURE_CLIENT_ID=... AZURE_CLIENT_SECRET=... \
  node scripts/migrate-onedrive-to-sharepoint.mjs

# Migración real:
AZURE_TENANT_ID=... AZURE_CLIENT_ID=... AZURE_CLIENT_SECRET=... \
  node scripts/migrate-onedrive-to-sharepoint.mjs
```
El script recorre `Conecta/` en la OneDrive de `diana.silva@caribelng.com` y copia cada archivo
a la misma ruta dentro de SharePoint. Es repetible (sobrescribe). No borra el origen: una vez
verificado en SharePoint, se puede archivar/eliminar la copia de OneDrive manualmente.
