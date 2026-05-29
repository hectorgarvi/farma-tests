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

## Banco de preguntas

Todas las preguntas viven en [`data/questions.json`](data/questions.json).
Formato de cada pregunta:

```json
{
  "id": "q001",
  "tema": "Farmacocinética",
  "dificultad": "facil",
  "enunciado": "¿...?",
  "opciones": ["A", "B", "C", "D"],
  "correcta": 0,
  "explicacion": "Por qué es correcta / aclaración."
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

Las preguntas actuales son **de ejemplo**. Se sustituirán por las generadas a
partir del temario.

## Ajustes

En [`js/app.js`](js/app.js), objeto `CONFIG`:

- `examSize`: nº de preguntas por examen (por defecto 55).
- `mix`: reparto objetivo por dificultad (`facil` 40 %, `medio` 35 %, `dificil` 25 %).
  Si no hay suficientes de un nivel, se rellena con las disponibles.

## Estructura

```
farma-tests/
├── index.html          # interfaz
├── css/styles.css      # estilos
├── js/app.js           # lógica (generación, corrección, resultados)
├── data/questions.json # banco de preguntas
└── .github/workflows/  # despliegue automático a GitHub Pages
```
