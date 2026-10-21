# CineScope — Aplicación de Escritorio con Electron y API Pública (Ejercicio 02)

Aplicación de escritorio diseñada y desarrollada con **HTML, CSS, JavaScript y Electron**, que consume la API pública oficial de **OMDb API (The Open Movie Database)** para buscar, explorar, filtrar y visualizar información de películas y producciones cinematográficas en tiempo real.

---

## 🎬 Información de la API Seleccionada

- **Nombre de la API**: OMDb API (The Open Movie Database)
- **URL Base del Servicio**: `https://www.omdbapi.com/`
- **Documentación Oficial**: [https://www.omdbapi.com/](https://www.omdbapi.com/)
- **Tipo de Acceso**: Libre y público, con consultas mediante solicitudes HTTP / REST.
- **Formato de Retorno**: JSON estructurado con datos oficiales de películas.
- **Justificación Académica**: Ofrece millones de registros de películas y series de todas las épocas, con imágenes de pósteres en alta resolución provenientes de los servidores de Amazon/IMDb, permitiendo implementar un mecanismo de búsqueda y múltiples filtros funcionales.

### Descripción de los campos de datos utilizados
1. `Title`: Título oficial de la película o producción.
2. `Year`: Año de estreno o lanzamiento comercial.
3. `imdbID`: Identificador alfanumérico único en la base de datos de IMDb.
4. `Type`: Tipo de formato audiovisual (`movie` para película, `series` para serie de televisión, `episode`).
5. `Poster`: URL del póster gráfico oficial de la película.
6. `Genre`: Géneros cinematográficos asociados (Acción, Aventura, Ciencia Ficción, Drama, etc.).
7. `Director`: Director o directores de la película.
8. `Actors`: Elenco de actores y actrices principales.
9. `Plot`: Sinopsis argumental completa.
10. `imdbRating`: Calificación promedio de la crítica y audiencia (escala 0 a 10).
11. `Runtime`: Duración de la película en minutos.
12. `Rated`: Clasificación por edades (PG-13, R, G, etc.).
13. `Awards`: Premios cinematográficos y nominaciones recibidas.
14. `BoxOffice`: Recaudación histórica en taquilla.

---

## 🚀 Requisitos y Pasos de Ejecución

### Prerrequisitos
- Tener instalado **Node.js** (versión 20 o superior) y **npm**.

### Instrucciones de ejecución
1. Abrir una consola de comandos en la carpeta `ejercicio_02`:
   ```bash
   cd "ejercicio_02"
   ```
2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Iniciar la aplicación de escritorio:
   ```bash
   npm start
   ```
4. (Opcional) Validar la sintaxis de los archivos:
   ```bash
   npm run check
   ```

> **Nota:** La aplicación se carga directamente en Electron mediante `loadFile` (`src/index.html`). No requiere Live Server ni servidores locales.

---

## 📋 Cumplimiento de Requisitos del Ejercicio

| Requisito Solicitado | Implementación |
| :--- | :--- |
| **API Pública adecuada** | OMDb API: HTTP/REST, JSON, millones de registros, temática de Películas. |
| **Listado de elementos** | Cuadrícula responsiva con tarjetas de películas, pósteres oficiales, título, año y formato. |
| **Buscador interactivo** | Búsqueda por título de película o saga (`s=...`, ej. *Inception*, *Avatar*, *Batman*). |
| **Filtro 1: Formato / Tipo** | Selector entre Películas (`movie`), Series (`series`) y Episodios. |
| **Filtro 2: Año de estreno** | Filtro por año de lanzamiento (`y=...`, ej. 2023, 2010, 1999). |
| **Filtro 3: Género** | Selector de género cinematográfico (Acción, Ciencia Ficción, Drama, Comedia, etc.). |
| **Paginación** | Paginación dinámica de 10 títulos por página con cálculo exacto de páginas totales. |
| **Nombre e Icono** | "CineScope" con icono personalizado en PNG e ICO dentro de `assets/`. |
| **Estructura Electron** | Separación clara entre `main.js`, `preload.js`, `src/index.html`, `src/css` y `src/js`. |
| **Seguridad de Electron** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `preload.js` con `contextBridge` y CSP estricta. |

---

## 📂 Estructura del Proyecto

```text
ejercicio_02/
├── package.json        # Dependencias, scripts y configuración del paquete
├── main.js             # Proceso principal: control de ventana nativa y políticas de seguridad
├── preload.js          # Script puente seguro con contextBridge
├── assets/
│   ├── icon.png        # Icono identificativo de CineScope (PNG)
│   └── icon.ico        # Icono identificativo para escritorio (ICO)
├── src/
│   ├── index.html      # Interfaz de usuario estructurada y semántica
│   ├── css/
│   │   └── styles.css  # Diseño cinematográfico moderno, tema Cinema Dark y Ruby Red
│   └── js/
│       └── app.js      # Consumo de OMDb API, filtros dinámicos, modal de película y paginación
└── README.md           # Documentación completa y guía de prueba
```

---

## 🔒 Consideraciones de Seguridad
1. **Aislamiento de contexto (`contextIsolation: true`)**: Impide que scripts del frontend modifiquen las funciones internas de Node.js.
2. **Sin acceso directo a Node en Renderer (`nodeIntegration: false`)**: Bloquea el uso de `require` o acceso a APIs del sistema operativo desde la web.
3. **Sandbox activo (`sandbox: true`)**: Confinamiento seguro en el proceso del renderer.
4. **Preload con contextBridge (`preload.js`)**: Comunicación controlada hacia el frontend.
5. **Content Security Policy (CSP)**: Autoriza únicamente peticiones hacia `https://www.omdbapi.com` y carga de imágenes desde servidores multimedia de Amazon/IMDb (`https://m.media-amazon.com`).
6. **Inserción segura de datos**: Construcción del DOM mediante `textContent` y `createElement` para prevenir vulnerabilidades XSS.

---

## 🧪 Pruebas y Casos de Uso Recomendados
1. **Búsqueda por película célebre**: Ingresar *"Inception"*, *"Avatar"* o *"Batman"* y presionar **Buscar**.
2. **Filtrado por formato**: Seleccionar Tipo *"Películas"* y comprobar que los resultados correspondan a largometrajes.
3. **Filtro por año de estreno**: Ingresar el año *"2010"* o *"2023"* y presionar **Buscar** para ver estrenos de ese período.
4. **Filtro por género**: Seleccionar género *"Ciencia Ficción"* o *"Acción"*.
5. **Ficha cinematográfica (Modal)**: Hacer clic en *"Ver Ficha de Película"* para abrir la ficha completa con sinopsis, director, actores, puntuación de IMDb y recaudación.
6. **Manejo sin conexión**: Desconectar la red temporalmente para validar el mensaje controlado de error de conectividad y posterior reintento.
