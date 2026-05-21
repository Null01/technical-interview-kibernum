# inventory-ms

Microservicio de inventario para una tienda de barrio colombiana.
Implementado con **NestJS 11** siguiendo **Arquitectura Hexagonal (Ports & Adapters)**.
Expone una API REST documentada con Swagger y se integra con el ecosistema de microservicios via Kafka.

---

## Índice

1. [Responsabilidad del servicio](#responsabilidad-del-servicio)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura hexagonal](#arquitectura-hexagonal)
4. [Módulos y wiring de dependencias](#módulos-y-wiring-de-dependencias)
5. [Modelo de dominio](#modelo-de-dominio)
6. [Casos de uso](#casos-de-uso)
7. [API REST](#api-rest)
8. [Integración Kafka](#integración-kafka)
9. [Documentación interactiva](#documentación-interactiva)
10. [Variables de entorno](#variables-de-entorno)
11. [Arrancar el servicio](#arrancar-el-servicio)
12. [Estructura del proyecto](#estructura-del-proyecto)

---

## Responsabilidad del servicio

`inventory-ms` es el núcleo de dominio del sistema. Sus responsabilidades son:

- Mantener el **catálogo de productos** (SKU, precio de compra, perecibilidad, unidad de medida)
- Gestionar el **stock físico** por producto y ubicación dentro de la tienda
- Registrar **todos los movimientos de inventario** como trazabilidad inmutable (compra, ajuste, devolución, merma, conteo inicial)
- Reaccionar al evento `order.created` de `orders-ms`: validar stock disponible, reservarlo y publicar el resultado como `inventory.validated` o `inventory.insufficient`

---

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **Node.js** | 20 LTS | Runtime |
| **TypeScript** | 5.x | Lenguaje |
| **NestJS** | 11.x | Framework HTTP + Microservice híbrido |
| **KafkaJS** | 2.x | Transporte Kafka vía `@nestjs/microservices` |
| **TypeORM** | 0.3.x | ORM — mapeo de entidades a PostgreSQL |
| **PostgreSQL** | 16 | Base de datos relacional |
| **`@nestjs/swagger`** | 11.x | Documentación OpenAPI 3 — REST |
| **AsyncAPI** | 2.6 | Documentación Kafka (custom controller + web component) |
| **dotenv** | transitivo | Carga de `.env` vía `import 'dotenv/config'` en `main.ts` |
| **Docker** | multi-stage | Imagen de producción sin devDependencies |

---

## Arquitectura hexagonal

El servicio sigue **Ports & Adapters** con tres capas y una regla de dependencia estricta:

```
┌──────────────────── Infrastructure ──────────────────────────────┐
│                                                                   │
│  HTTP Controllers     Kafka Consumer      TypeORM / Kafka        │
│  (products, health)   (order.created)     (repos, publisher)     │
│         │                   │                      │             │
│         └───────────────────┼──────────────────────┘             │
│                             │  depende de ▼                      │
├─────────────────── Application ──────────────────────────────────┤
│                             │                                     │
│          CreateProductUseCase  FindProductUseCase                 │
│          ValidateStockUseCase                                     │
│                             │  depende de ▼                      │
├────────────────────── Domain ─────────────────────────────────────┤
│                                                                   │
│   ProductModel   InventoryStockModel   StockMovementModel         │
│   ProductRepositoryPort   InventoryStockRepositoryPort            │
│   StockMovementRepositoryPort   EventPublisherPort                │
│                                                                   │
│   ← CERO dependencias de framework. TypeScript puro. →           │
└───────────────────────────────────────────────────────────────────┘
```

### Regla de dependencia

Las flechas de dependencia **solo apuntan hacia adentro**: Infrastructure → Application → Domain.
El dominio no importa nada de NestJS, TypeORM, ni KafkaJS. Esto garantiza que las reglas de negocio son testeables de forma aislada y que cualquier adaptador (TypeORM, Mongo, in-memory) puede sustituirse sin tocar la capa de aplicación.

### Patrón de inyección de dependencias con tokens string

Cada puerto del dominio exporta un token string constante que actúa como clave de DI en NestJS:

```typescript
// domain/product/product.repository.port.ts
export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';
export interface ProductRepositoryPort { ... }
```

```typescript
// persistence.module.ts
{ provide: PRODUCT_REPOSITORY, useClass: ProductTypeormRepository }
```

```typescript
// use-case
@Inject(PRODUCT_REPOSITORY) private readonly repo: ProductRepositoryPort
```

Para reemplazar la implementación de persistencia (e.g. cambiar a MongoDB) basta con cambiar el `useClass` en `PersistenceModule` sin modificar ningún caso de uso.

### Mapper pattern

Cada agregado tiene un mapper `@Injectable()` con métodos `toDomain(orm)` y `toOrm(domain)` que traduce entre la entidad ORM y el modelo de dominio. Esto desacopla el esquema de base de datos de las interfaces del dominio.

---

## Módulos y wiring de dependencias

```
AppModule
├── TypeOrmModule.forRoot(...)        ← conexión global a inventory_db
├── InventoryFeatureModule            ← módulo raíz del feature
│   ├── imports: PersistenceModule
│   │   ├── TypeOrmModule.forFeature([...8 entidades])
│   │   ├── providers: ProductMapper, InventoryStockMapper, StockMovementMapper
│   │   └── provides+exports:
│   │       PRODUCT_REPOSITORY → ProductTypeormRepository
│   │       INVENTORY_STOCK_REPOSITORY → InventoryStockTypeormRepository
│   │       STOCK_MOVEMENT_REPOSITORY → StockMovementTypeormRepository
│   ├── imports: MessagingModule
│   │   ├── ClientsModule.register([KAFKA_SERVICE])
│   │   ├── providers: KafkaEventPublisher
│   │   └── provides+exports: EVENT_PUBLISHER → KafkaEventPublisher
│   ├── controllers:
│   │   ├── ProductsHttpController      (GET/POST /products)
│   │   ├── HealthHttpController        (GET /health)
│   │   └── InventoryEventsKafkaController  (@EventPattern order.created)
│   └── providers:
│       ├── CreateProductUseCase
│       ├── FindProductUseCase
│       └── ValidateStockUseCase
└── AsyncApiModule
    └── AsyncApiController  (GET /async-api, GET /async-api/json)
```

---

## Modelo de dominio

### Catálogo

| Entidad | Tabla | Descripción |
|---|---|---|
| `CategoryModel` | `categories` | Árbol de categorías con auto-referencia `parentId`; e.g. Bebidas → Gaseosas |
| `BrandModel` | `brands` | Marcas de productos; e.g. Coca-Cola, Nestlé |
| `UnitOfMeasureModel` | `units_of_measure` | Unidades base: `UNIT`, `WEIGHT`, `VOLUME`, `LENGTH`, `AREA`, `PACK` |
| `ProductModel` | `products` | Catálogo principal |

**Campos clave de `ProductModel`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `sku` | `string` | Código interno único (Stock Keeping Unit) |
| `barcode` | `string \| null` | EAN-13 / UPC |
| `categoryId / brandId / uomId` | `number` | FK a tablas de catálogo |
| `purchasePrice` | `number` | Costo de compra al proveedor |
| `minStock / maxStock` | `number` | Umbrales de alerta y capacidad |
| `reorderPoint / reorderQuantity` | `number` | Lógica de reposición automática |
| `isPerishable / shelfLifeDays` | `boolean / number` | Gestión de perecederos |
| `requiresRefrigeration` | `boolean` | Cadena de frío |
| `isActive` | `boolean` | Soft-delete lógico |

### Stock & Ubicaciones

| Entidad | Tabla | Descripción |
|---|---|---|
| `StorageLocationModel` | `storage_locations` | Ubicaciones físicas (pasillo, estante, bodega) |
| `InventoryStockModel` | `inventory_stock` | Cantidad actual por producto × ubicación; constraint `UNIQUE(product_id, location_id)` |
| `StockMovementModel` | `stock_movements` | Registro **inmutable** append-only de cada movimiento |
| `BatchModel` | `batches` | Lotes con número de lote y fecha de vencimiento |

### Auditoría

Todas las tablas heredan campos de auditoría. `AuditableEntity` provee `created_at`, `updated_at`, `created_by`, `updated_by`. `ImmutableAuditEntity` (para `stock_movements`) solo provee `created_at`, `created_by` ya que los movimientos no se modifican.

---

## Casos de uso

### `CreateProductUseCase`

Registra un nuevo producto en el catálogo delegando al `ProductRepositoryPort`.
Aplica valores por defecto para campos opcionales (`isActive: true`, `minStock: 0`, etc.).

### `FindProductUseCase`

- `findAll()` — Retorna todos los productos con `isActive = true`
- `findById(id)` — Retorna un producto por ID o lanza `ProductNotFoundException` (excepción de dominio, mapeada a HTTP 404 en el controller)

### `ValidateStockUseCase`

El caso de uso más crítico del servicio. Se ejecuta al recibir el evento `order.created`:

```
1. Busca el stock actual del producto (inventoryStockRepository.findByProductId)
2. Calcula disponible = quantity - reservedQty
3a. Si disponible < quantity solicitada:
    → publica KAFKA_TOPIC_INVENTORY_INSUFFICIENT con { orderId, productId, reason }
3b. Si hay stock suficiente:
    → actualiza quantity en inventory_stock (descuenta la reserva)
    → registra StockMovement (tipo: ADJUSTMENT_OUT, con referenceType='order', referenceId=orderId)
    → publica KAFKA_TOPIC_INVENTORY_VALIDATED con { orderId, productId, quantity }
```

---

## API REST

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /products`

Retorna el array de productos activos.

```json
[
  {
    "id": 1,
    "sku": "BEB-COK-500",
    "barcode": "7702036040248",
    "name": "Coca-Cola 500 mL",
    "categoryId": 5,
    "brandId": 1,
    "uomId": 5,
    "purchasePrice": 2000,
    "minStock": 24,
    "maxStock": 96,
    "reorderPoint": 36,
    "reorderQuantity": 48,
    "isPerishable": false,
    "requiresRefrigeration": false,
    "isActive": true,
    ...
  }
]
```

### `POST /products`

Crea un producto. Retorna `201 Created`.

**Body:**

```json
{
  "sku": "BEB-COK-500",
  "name": "Coca-Cola 500 mL",
  "categoryId": 5,
  "uomId": 5,
  "purchasePrice": 2000,
  "barcode": "7702036040248",
  "brandId": 1,
  "minStock": 24,
  "maxStock": 96,
  "reorderPoint": 36,
  "reorderQuantity": 48,
  "isPerishable": false,
  "requiresRefrigeration": false
}
```

Campos opcionales: `barcode`, `description`, `brandId`, `minStock`, `maxStock`, `reorderPoint`, `reorderQuantity`, `isPerishable`, `shelfLifeDays`, `requiresRefrigeration`.

### `GET /products/:id`

Retorna el detalle de un producto. Responde `404 Not Found` si no existe.

---

## Integración Kafka

El servicio opera en modo **híbrido**: escucha HTTP y Kafka simultáneamente desde el mismo proceso NestJS.

### Configuración del transporte

En `main.ts` se llama a `app.connectMicroservice()` con `Transport.KAFKA` antes de `app.listen()`. El consumer lee de Kafka con el grupo `KAFKA_CONSUMER_GROUP_ID` y el productor se conecta en `MessagingModule.onModuleInit()`.

### Topics

| Variable de entorno | Valor por defecto | Dirección | Payload |
|---|---|---|---|
| `KAFKA_TOPIC_ORDER_CREATED` | `order.created` | **Consumido** | `{ orderId: number, productId: number, quantity: number }` |
| `KAFKA_TOPIC_INVENTORY_VALIDATED` | `inventory.validated` | **Publicado** | `{ orderId: number, productId: number, quantity: number }` |
| `KAFKA_TOPIC_INVENTORY_INSUFFICIENT` | `inventory.insufficient` | **Publicado** | `{ orderId: number, productId: number, reason: string }` |

### Patrón del publisher

`KafkaEventPublisher` implementa `EventPublisherPort` (interfaz de dominio) y usa `ClientKafka.emit()` envuelto en `lastValueFrom` para convertir el `Observable` a `Promise`. Esto desacopla el dominio/aplicación del SDK de Kafka.

```typescript
async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
  await lastValueFrom(this.kafkaClient.emit(topic, payload));
}
```

---

## Documentación interactiva

Una vez el servicio está corriendo, dos UIs quedan disponibles:

| UI | URL | Descripción |
|---|---|---|
| **Swagger REST** | http://localhost:3001/api | OpenAPI 3 — todos los endpoints HTTP con esquemas de request/response |
| **AsyncAPI Kafka** | http://localhost:3001/async-api | AsyncAPI 2.6 — channels, mensajes y schemas Kafka |
| AsyncAPI JSON raw | http://localhost:3001/async-api/json | Spec en formato JSON para tooling externo |

### Swagger CLI Plugin

`nest-cli.json` activa el plugin `@nestjs/swagger` con `introspectComments: true`. Esto permite que los comentarios JSDoc sobre propiedades de DTOs sean extraídos automáticamente como descripciones en el spec OpenAPI, sin duplicar anotaciones.

### AsyncAPI sin librería externa

La documentación Kafka está implementada como un controlador NestJS custom (`AsyncApiController`) que sirve:
- La spec `ASYNC_API_SPEC` como objeto TypeScript con el URL del broker tomado de `process.env.KAFKA_BROKER`
- Una página HTML que carga el web component `@asyncapi/web-component@2.4.0` desde CDN con la spec embebida inline

---

## Variables de entorno

Copiar el archivo de ejemplo y editar los valores:

```bash
cp .env .env
```

El archivo `.env` se carga automáticamente al iniciar el proceso vía `import 'dotenv/config'` como primera línea de `main.ts`. En producción (Docker) los valores se inyectan directamente por el orquestador y el `.env` no es necesario.

### Referencia completa

| Variable | Default | Descripción |
|---|---|---|
| **Servidor** | | |
| `PORT` | `3001` | Puerto HTTP del servicio |
| `NODE_ENV` | `development` | Entorno: `development` \| `production` \| `test` |
| **Kafka — Conexión** | | |
| `KAFKA_BROKER` | `localhost:9094` | Dirección `host:puerto` del broker. Local: `localhost:9094`. Docker: `kafka:9092` |
| `KAFKA_CLIENT_ID` | `inventory` | Identificador del consumidor en el broker |
| `KAFKA_PRODUCER_CLIENT_ID` | `inventory-producer` | Identificador del productor en el broker |
| `KAFKA_CONSUMER_GROUP_ID` | `inventory-consumer-group` | Grupo de consumidores. Clave para escalar horizontalmente con reparto de particiones |
| **Kafka — Topics** | | |
| `KAFKA_TOPIC_ORDER_CREATED` | `order.created` | Topic que este servicio **consume** (evento de orders-ms) |
| `KAFKA_TOPIC_INVENTORY_VALIDATED` | `inventory.validated` | Topic que este servicio **publica** cuando hay stock |
| `KAFKA_TOPIC_INVENTORY_INSUFFICIENT` | `inventory.insufficient` | Topic que este servicio **publica** cuando no hay stock |
| **PostgreSQL** | | |
| `DB_HOST` | `localhost` | Host del servidor PostgreSQL |
| `DB_PORT` | `5432` | Puerto PostgreSQL |
| `DB_USER` | `admin` | Usuario de la base de datos |
| `DB_PASSWORD` | `admin123` | Contraseña de la base de datos |
| `DB_NAME` | `inventory_db` | Nombre de la base de datos |
| `DB_SYNCHRONIZE` | `true` | Si TypeORM sincroniza el esquema automáticamente. **Establecer en `false` en producción** y usar migrations |

> **Advertencia sobre `DB_SYNCHRONIZE`:** en `true`, TypeORM altera/crea tablas al arrancar basándose en las entidades. Es conveniente en desarrollo pero destructivo si se usa con una base de datos de producción que ya tiene datos. Siempre `false` en producción.

> **Advertencia sobre `KAFKA_CONSUMER_GROUP_ID`:** si se levantan múltiples instancias del servicio, todas deben tener el mismo `groupId` para que Kafka distribuya las particiones entre ellas. Cambiar este valor implica que el offset de consumo se reinicia desde el principio (o según la política `auto.offset.reset`).

---

## Arrancar el servicio

### Requisitos previos

Kafka y PostgreSQL deben estar corriendo. La forma más simple es levantarlos vía docker-compose desde la raíz del repositorio:

```bash
# Desde la raíz del repo
docker compose up kafka postgres -d
```

### Desarrollo local (watch mode)

```bash
cp .env .env      # una sola vez
npm install               # una sola vez
npm run start:dev         # recarga automática al guardar
```

### Compilar y correr en modo producción

```bash
npm run build
npm run start:prod
```

### Con Docker

```bash
# Desde la raíz del repo
docker compose up --build inventory-ms
```

### Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start:dev` | Modo watch con recarga automática |
| `npm run start:prod` | Ejecuta la build compilada en `dist/` |
| `npm run build` | Compila TypeScript vía NestJS CLI |
| `npm run lint` | ESLint con auto-fix |
| `npm run test` | Tests unitarios con Jest |
| `npm run test:cov` | Tests con reporte de cobertura |

---

## Estructura del proyecto

```
inventory-ms/
├── .env.example                   # Plantilla de variables de entorno
├── Dockerfile                     # Multi-stage: builder + production
├── nest-cli.json                  # Swagger CLI plugin (introspectComments: true)
├── tsconfig.json / tsconfig.build.json
└── src/
    ├── main.ts                    # Bootstrap: dotenv + Kafka transport + Swagger + listen
    ├── app.module.ts              # TypeOrmModule.forRoot + InventoryFeatureModule + AsyncApiModule
    │
    ├── domain/                    ← Núcleo — cero dependencias de framework
    │   ├── product/
    │   │   ├── product.model.ts            # interface ProductModel
    │   │   ├── product.repository.port.ts  # PRODUCT_REPOSITORY token + interface
    │   │   └── product-not-found.exception.ts
    │   ├── inventory/
    │   │   ├── inventory-stock.model.ts
    │   │   ├── inventory-stock.repository.port.ts   # INVENTORY_STOCK_REPOSITORY
    │   │   ├── stock-movement.model.ts
    │   │   ├── stock-movement.repository.port.ts    # STOCK_MOVEMENT_REPOSITORY
    │   │   ├── batch.model.ts
    │   │   └── movement-type.enum.ts                # 8 tipos de movimiento
    │   ├── category/brand/unit-of-measure/storage-location/
    │   │   └── *.model.ts + *.repository.port.ts
    │   └── shared/ports/
    │       └── event-publisher.port.ts    # EVENT_PUBLISHER token + interface
    │
    ├── application/               ← Casos de uso — orquestan puertos de dominio
    │   ├── product/
    │   │   ├── commands/create-product.command.ts
    │   │   └── use-cases/
    │   │       ├── create-product.use-case.ts
    │   │       └── find-product.use-case.ts
    │   └── inventory/
    │       ├── commands/validate-stock.command.ts
    │       └── use-cases/validate-stock.use-case.ts
    │
    ├── infrastructure/            ← Adaptadores concretos
    │   ├── persistence/
    │   │   ├── persistence.module.ts         # Wirings TypeORM → tokens de dominio
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   ├── auditable.orm-entity.ts        # AuditableEntity + ImmutableAuditEntity
    │   │       │   ├── category.orm-entity.ts
    │   │       │   ├── brand.orm-entity.ts
    │   │       │   ├── unit-of-measure.orm-entity.ts
    │   │       │   ├── storage-location.orm-entity.ts
    │   │       │   ├── product.orm-entity.ts
    │   │       │   ├── inventory-stock.orm-entity.ts
    │   │       │   ├── stock-movement.orm-entity.ts
    │   │       │   └── batch.orm-entity.ts
    │   │       ├── mappers/
    │   │       │   ├── product.mapper.ts              # toDomain() / toOrm()
    │   │       │   ├── inventory-stock.mapper.ts
    │   │       │   └── stock-movement.mapper.ts
    │   │       └── repositories/
    │   │           ├── product.typeorm-repository.ts
    │   │           ├── inventory-stock.typeorm-repository.ts
    │   │           └── stock-movement.typeorm-repository.ts
    │   ├── messaging/
    │   │   ├── messaging.module.ts           # ClientsModule + EVENT_PUBLISHER wiring
    │   │   └── kafka-event-publisher.ts      # implements EventPublisherPort
    │   └── inventory/                        ← Feature module raíz
    │       ├── inventory.module.ts           # Importa Persistence + Messaging, declara controllers + use cases
    │       ├── controllers/
    │       │   ├── products.http.controller.ts         # REST /products
    │       │   ├── health.http.controller.ts           # GET /health
    │       │   └── inventory-events.kafka.controller.ts  # @EventPattern(order.created)
    │       └── dtos/
    │           └── create-product.dto.ts    # implements CreateProductCommand + @ApiProperty
    │
    └── async-api/                 ← Documentación Kafka
        ├── async-api.spec.ts      # Objeto ASYNC_API_SPEC (AsyncAPI 2.6)
        ├── async-api.controller.ts # Sirve HTML con web component + JSON raw
        └── async-api.module.ts
```
