# Radar Subvenciones — Contexto Operativo para Codex

## Identidad del proyecto

Radar Subvenciones es un sistema híbrido de:

- scraping de subvenciones públicas
- clasificación y normalización
- generación de feeds B2B para asesorías
- SEO programático
- captura de leads

El producto principal NO es la web.

El activo principal es:

- el pipeline de ingestión
- la clasificación comercial
- la generación de feeds accionables

La web es secundaria y actúa como:
- distribución SEO
- adquisición
- branding
- captación de leads

## Prioridad absoluta

Priorizar SIEMPRE:

1. calidad del feed
2. estabilidad del scraper
3. clasificación comercial
4. normalización de datos
5. fiabilidad del pipeline

NO priorizar:
- animaciones
- diseño
- refactors innecesarios
- arquitectura enterprise
- complejidad visual
- features “IA” sin utilidad comercial

---

# Filosofía técnica

Este proyecto debe mantenerse:

- simple
- modular
- mantenible
- barato de operar
- fácil de depurar

Evitar:
- sobreingeniería
- abstracciones innecesarias
- multiagentes complejos
- microservicios
- arquitecturas distribuidas
- dependencias excesivas

---

# Arquitectura actual

## Scraper

Entrypoint principal:

scraper/index.js

Fuentes actuales:
- BOE
- BDNS

Notas sobre fuentes:
- BDNS es fuente estructurada oficial.
- scraper/fuente-boe.js usa Google News RSS como mecanismo de discovery para encontrar publicaciones relacionadas con BOE, boletines y convocatorias.
- Google News RSS es una dependencia de discovery; no debe confundirse con una fuente oficial de verdad ni con una fuente estructurada final.
- Cualquier mejora futura debe preservar la separación entre discovery y fuente oficial.

Motor principal:

scraper/motor.js

Taxonomías:

scraper/taxonomia.js

Export B2B:

scraper/export-asesorias.js

## Web

Framework:
- Astro

La web NO debe mezclarse con la lógica del scraper.

---

# Producto B2B

El producto comercial principal es:

exports/feed-asesorias-*.csv

Objetivo:
reducir ruido burocrático para asesorías y gestorías.

El feed NO debe incluir todas las ayudas.

Debe priorizar:
- pymes
- autónomos
- empleo
- contratación
- digitalización
- innovación
- internacionalización
- industria
- sostenibilidad empresarial

Debe penalizar:
- ruido institucional
- ayudas ceremoniales
- subvenciones hiperlocales irrelevantes
- convocatorias poco accionables

---

# Reglas operativas

Antes de modificar:
1. inspeccionar archivos relacionados
2. explicar qué se va a tocar
3. justificar cambios importantes

Después de modificar:
1. explicar cambios
2. ejecutar validaciones razonables
3. mostrar impacto funcional
4. evitar romper compatibilidad

---

# Restricciones

NO:
- modificar producción a ciegas
- tocar múltiples capas simultáneamente
- mezclar scraper y frontend
- introducir frameworks nuevos sin motivo
- tocar Supabase sin necesidad clara
- modificar SEO mientras se estabiliza el pipeline

---

# Estrategia actual

Fase actual:
estabilización y mejora del producto de datos B2B.

NO estamos:
- rehaciendo la plataforma
- creando un SaaS enterprise
- construyendo IA autónoma compleja

SÍ estamos:
- refinando clasificación comercial
- reduciendo ruido
- mejorando precisión
- aumentando valor del feed

---

# Estilo de trabajo esperado

- cambios pequeños
- commits claros
- ramas específicas
- mínima complejidad posible
- foco en utilidad comercial real

Si hay varias soluciones:
elegir la más simple y mantenible.
