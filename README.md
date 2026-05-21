# technical-interview-kibernum


Sistema de gestión de inventario para una tienda de barrio, implementado tres microservicios creados con NestJS, comunicación asíncrona vía Kafka y persistencia en PostgreSQL.

---

## Stack

| Tecnología                  | Versión | Rol                                         |
|-----------------------------|---|---------------------------------------------|
| **Node.js**                 | 20 LTS | Runtime                                     |
| **TypeScript**              | 5.x | Lenguaje                                    |
| **NestJS**                  | 11.x | Framework HTTP + Microservices              |
| **KafkaJS**                 | 2.x | Cliente Kafka (`@nestjs/microservices`)     |
| **TypeORM**                 | 0.3.x | ORM                                         |
| **PostgreSQL**              | 16 | Base de datos relacional                    |
| **Kafka**                   | 3.7 (bitnami) | Message broker — modo KRaft (sin Zookeeper) |
| **Docker / Docker Compose** | v2 | Contenedorización y orquestación local      |
| **Swagger / OpenAPI**       | `@nestjs/swagger` 11.x | Documentación REST (`inventory-ms`)         |
| **AsyncAPI**                | 2.6 | Documentación Kafka (`inventory-ms`)        |
| **Sonarqube**               | 2.6 | Documentación Sonarqube (`orders-ms`)       |

---

## Puesta en marcha

El entorno local está dividido en dos capas independientes de Docker Compose:

| Archivo | Contenido |
|---|---|
| `docker-compose.infra.yml` | Kafka, PostgreSQL, Kafka-UI, SonarQube |
| `docker-compose.yml` | inventory-ms, orders-ms, payments-ms |

Los microservicios se conectan a la infraestructura a través de la red `microservices-net`, definida en el archivo de infra y referenciada como externa en el de servicios.

```bash
# 1 · Levantar infraestructura (Kafka · PostgreSQL · Kafka-UI · SonarQube)
docker compose -f docker-compose.infra.yml up

# 2 · Construir y levantar microservicios
docker compose up -d --build

# Reconstruir un único servicio
docker compose up -d --build orders-ms

# Ver logs de todos los servicios
docker compose logs -f

# Detener solo los microservicios (infra sigue corriendo)
docker compose down

# Detener la infraestructura (datos persisten en volúmenes)
docker compose -f docker-compose.infra.yml down

# Reset completo — detiene todo y elimina volúmenes
docker compose -f docker-compose.infra.yml down -v
```

---

## Patrones

**Arquitectura Hexagonal (Ports & Adapters)**

**Transactional Outbox**

**Saga Coreografiada**

**Propagación de `correlationId`**

---

## Pruebas

Los tres microservicios incluyen pruebas unitarias sobre los casos de uso de la capa de aplicación. Las dependencias de infraestructura (repositorios, publicador de eventos, unidad de trabajo) se sustituyen por dobles de prueba (`jest.fn()`) inyectados directamente, aprovechando el desacoplamiento que provee la arquitectura hexagonal.

```bash
# Ejecutar pruebas en cualquier microservicio
cd inventory-ms   # o orders-ms / payments-ms
npm run test

# Con cobertura
npm run test:cov
```

---

## Documentación

### APIs interactivas

| Microservicio | Swagger REST | AsyncAPI Kafka |
|---|---|---|
| `inventory-ms` | http://localhost:3001/api | http://localhost:3001/async-api |
| `orders-ms` | http://localhost:3002/api | — |
| `payments-ms` | http://localhost:3003/api | — |

> La spec AsyncAPI en formato JSON está disponible en http://localhost:3001/async-api/json

### Diagramas

| Recurso | Archivo | Descripción |
|---|---|---|
| Diagrama de secuencia | [`docs/sequence-diagram.md`](docs/sequence-diagram.md) | Flujo completo de eventos Kafka entre los tres servicios (Mermaid) |
| Diagrama entidad-relación | [`docs/relation-diagram.md`](docs/relation-diagram.md) | Modelo de datos de las tres bases de datos con enums y referencias cross-DB (Mermaid + PNG) |

### Herramientas externas

| Herramienta | URL | Descripción |
|---|---|---|
| Kafka UI | http://localhost:8080 | Inspección de topics, consumer groups y mensajes en tiempo real |
| SonarQube | http://localhost:9000 | Análisis estático de calidad y cobertura de código |

