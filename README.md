# Mis Finanzas

App de presupuesto personal para iPhone, basada en mi Excel de finanzas. Funciona como una app instalada (PWA): se abre desde su ícono, a pantalla completa y sin internet.

## Qué hace

- **Inicio:** cuánto dinero te queda sin usar este mes, lo que falta por pagar, cuánto te quedaría al final del mes y los días que faltan para tu pago.
- **Mes:** el presupuesto con las mismas secciones del Excel (ingresos, ahorros, gastos fijos, gastos variables y deudas), con estimado contra real y gráficos.
- **Gastos:** registro rápido de cada gasto. El "real" de cada categoría de gastos variables se suma solo.
- **Deudas:** pagos de cada mes y, si le pones el saldo, cuánto te falta y en cuántos meses terminas.
- **Año:** resumen anual mes a mes, con gráficos.
- **Ajustes:** exportar todo a Excel, guardar y restaurar respaldos, elegir la moneda y ver la guía.
- **Primera vez:** guía de bienvenida de 3 pantallas y configuración inicial (moneda, ingreso, día de pago); el mes se arma con una plantilla de categorías comunes.

Las fórmulas son las del Excel:

- Diferencia (ingresos) = Real − Estimado
- Diferencia (gastos, ahorros y deudas) = Estimado − Real
- Real de gastos variables = suma de los gastos de esa categoría
- **Sin usar = Ingresos − (Ahorros + Gastos fijos + Gastos variables + Deudas)**

## Privacidad

Los datos se guardan **solo en el iPhone** (almacenamiento local de la app). No hay servidor ni base de datos: este repositorio contiene únicamente el código. Para no perder nada, usa **Ajustes → Guardar respaldo** de vez en cuando y guarda el archivo en Archivos o iCloud Drive.

El `.gitignore` bloquea archivos `.xlsx` y `.json` para no subir datos personales por accidente.

## Instalar en el iPhone

1. Abre la dirección de la app en **Safari**.
2. Toca **Compartir** → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre la app desde el ícono **Finanzas**.
4. La guía de bienvenida te ayuda a armar tu primer mes.

Los datos de Safari y los de la app instalada están separados en iOS, así que úsala desde el ícono.

## Publicar con GitHub Pages

En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. La app queda en `https://<usuario>.github.io/mis-finanzas/`.

## Hacer cambios

No hay paso de compilación: son archivos HTML, CSS y JavaScript (Preact + htm y fflate van incluidos en `vendor/`).

- Probar en la computadora: `python3 -m http.server` en esta carpeta y abrir `http://localhost:8000`.
- Pruebas: `npm test` (usan datos inventados).
- Al publicar cambios, sube el número de versión en `sw.js` (`CACHE`) y en `js/version.js`. Así el iPhone descarga la versión nueva y la app muestra el aviso "Hay una versión nueva".

## Estructura

```
index.html, manifest.webmanifest, sw.js   App instalable y funcionamiento sin internet
css/app.css                                Estilos (modo claro y oscuro)
js/calc.js                                 Cálculos (las fórmulas del Excel)
js/store.js                                Datos guardados en el teléfono
js/xlsx-export.js                          Exportar a Excel
js/charts.js                               Gráficos
js/views/                                  Pantallas
vendor/                                    Librerías incluidas (con sus licencias)
```
