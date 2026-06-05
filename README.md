# 💊 Farma Tests

Simulador de examen tipo test para estudiar. Web estática (sin backend, sin
build) servida en GitHub Pages. Genera exámenes de **55 preguntas** mezclando
todos los niveles de dificultad, corrige al instante y explica los fallos.

## Características

- Exámenes de 55 preguntas (configurable) elegidas al azar del banco.
- Mezcla de dificultades: fácil / medio / difícil.
- **Feedback inmediato** (corrige cada pregunta al responder) o al final.
- Explicación de la respuesta correcta cuando fallas.
- Opción de barajar el orden de las respuestas.
- Pantalla de resultados con porcentaje y revisión pregunta a pregunta.

## Cómo se usa

Abre la web publicada en GitHub Pages (ver pestaña *Settings → Pages* del repo),
o en local sirviéndola con cualquier servidor estático:

```bash
cd farma-tests
python3 -m http.server 8000
# abre http://localhost:8000
```

> No vale con abrir `index.html` con doble clic: `fetch()` del JSON necesita
> servirse por HTTP.

## Asignaturas

Hay varias asignaturas, cada una con su propio banco. El listado está en
[`data/subjects.json`](data/subjects.json):

```json
{ "asignaturas": [
  { "id": "farmacologia", "nombre": "Farmacología y Nutrición", "archivo": "farmacologia.json" },
  { "id": "pnaya", "nombre": "PNAyA · Patología Nutricional", "archivo": "pnaya.json" }
] }
```

La web muestra un selector de pestañas (solo si hay 2+ asignaturas) y recuerda
la última elegida en `localStorage`, así que **no se resetea al recargar**.
Para añadir una asignatura: crea su `data/<id>.json` y añade una entrada al
manifiesto.

## Banco de preguntas

Cada asignatura tiene su archivo `data/<id>.json`. Formato de cada pregunta:

```json
{
  "id": "q001",
  "tema": "Farmacocinética",
  "dificultad": "facil",
  "enunciado": "¿...?",
  "opciones": ["A", "B", "C", "D"],
  "correcta": 0,
  "explicacion": "Por qué es correcta / aclaración.",
  "porques": ["", "Por qué B es incorrecta.", "Por qué C…", "Por qué D…"]
}
```

| Campo         | Tipo    | Notas                                                      |
| ------------- | ------- | ---------------------------------------------------------- |
| `id`          | string  | Único (ej. `q001`).                                        |
| `tema`        | string  | Bloque del temario. Se muestra como etiqueta.              |
| `dificultad`  | string  | `facil`, `medio` o `dificil`.                              |
| `enunciado`   | string  | La pregunta.                                               |
| `opciones`    | array   | 4 respuestas (admite 2–6).                                 |
| `correcta`    | entero  | Índice base 0 de la opción correcta dentro de `opciones`.  |
| `explicacion` | string  | Se muestra al fallar o en la revisión.                     |
| `porques`     | array   | Opcional. Alineado con `opciones`: por qué cada opción incorrecta lo es (cadena vacía en la correcta). Si falta, no se muestra. |

Las preguntas se generan a partir del temario de cada asignatura.

## Ajustes

En [`js/app.js`](js/app.js), objeto `CONFIG`:

- `examSize`: nº de preguntas por examen (por defecto 55).
- `mix`: reparto objetivo por dificultad (`facil` 40 %, `medio` 35 %, `dificil` 25 %).
  Si no hay suficientes de un nivel, se rellena con las disponibles.

## Estructura

```
farma-tests/
├── index.html              # interfaz
├── css/styles.css          # estilos
├── js/app.js               # lógica (asignaturas, generación, corrección)
├── data/subjects.json      # manifiesto de asignaturas
├── data/farmacologia.json  # banco de Farmacología
├── data/pnaya.json         # banco de PNAyA
└── .github/workflows/      # despliegue automático a GitHub Pages
```
