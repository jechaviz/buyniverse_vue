# Tablas de gran escala

`DataTable` conserva el modo local para los datos demo. Para listas reales no recibe millones de filas: se le pasa un `data-source` creado con `BuyniverseTableQuery.createCursorDataSource`.

```js
const source = window.BuyniverseTableQuery.createCursorDataSource({
  endpoint: "/api/v1/search/projects",
  cacheTtlMs: 30_000,
  maxCacheEntries: 80,
  debounceMs: 150,
});
```

```html
<DataTable :data-source="source" :columns="columns" table-id="projects" />
```

La tabla envía un `POST` mismo origen, cancelable, con este contrato:

```json
{
  "query": "mobile design",
  "filters": [{"field":"status","operator":"equals","value":"OPEN"}],
  "logic": "and",
  "sort": [{"field":"updatedAt","direction":"desc"}],
  "page": {"size":50,"cursor":"opaque-cursor-or-null"},
  "fields": ["id","title","status","updatedAt"],
  "facets": ["status"]
}
```

La respuesta debe seguir el mismo modelo independiente del motor:

```json
{
  "hits": [],
  "page": {"nextCursor":"opaque-cursor","total":1200345,"totalRelation":"eq"},
  "facets": {"status":[{"value":"OPEN","count":420110}]},
  "tookMs": 18
}
```

## Servicio de búsqueda

El navegador **no** debe conectarse directamente a Elasticsearch, OpenSearch, Typesense o Meilisearch. El endpoint propio aplica autorización por objeto, lista blanca de campos/filtros/ordenamientos, cuota por identidad, máximo de cláusulas, límite de tiempo y auditoría. La clave del motor nunca llega al cliente.

Para Elasticsearch/OpenSearch, traducir el cursor a `search_after` dentro de un `point in time` (PIT) de vida corta y ordenar siempre por campo estable más `_id`. Firmar o cifrar el cursor antes de devolverlo; no exponer el vector `search_after`. Para resultados muy grandes devolver `totalRelation: "gte"` y no calcular conteos exactos en cada pulsación.

El componente limita páginas a 200 filas: el DOM, los eventos y la selección permanecen acotados, sin scroll infinito que acumule millones de nodos. La búsqueda se debounced (150 ms por defecto), aborta consultas obsoletas, coalesce solicitudes sin señal de cancelación y mantiene una caché LRU con TTL. La paginación cursor sólo permite avanzar o volver a cursores ya visitados, evitando los costes y anomalías de `from + size`.

Para "search as you type", indexar campos `search_as_you_type`/edge n-grams o un índice dedicado; exigir mínimo dos caracteres para consultas globales de alto volumen en el servidor y degradar a sugerencias/facetas si se excede el presupuesto de latencia. La interfaz ya conserva el último resultado mientras la siguiente consulta llega y muestra tiempo de búsqueda cuando el backend lo informa.
