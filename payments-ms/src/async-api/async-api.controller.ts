/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ASYNC_API_SPEC } from './async-api.constants';

@ApiExcludeController()
@Controller('async-api')
export class AsyncApiController {
  /** JSON spec — AsyncAPI 2.6 */
  @Get('json')
  @Header('Content-Type', 'application/json')
  getSpec() {
    return ASYNC_API_SPEC;
  }

  /** UI — AsyncAPI viewer (HTML) */
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getUi(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payments MS — Kafka API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; }
    nav {
      background: #1a1d27;
      border-bottom: 1px solid #2d3149;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    nav .badge {
      background: #7b4de8;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .05em;
      padding: 3px 9px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    nav .title { color: #e2e8f0; font-size: 15px; font-weight: 600; }
    nav .links { margin-left: auto; display: flex; gap: 16px; }
    nav .links a {
      color: #94a3b8;
      font-size: 13px;
      text-decoration: none;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid #2d3149;
      transition: all .15s;
    }
    nav .links a:hover { color: #e2e8f0; border-color: #7b4de8; }
    asyncapi-component {
      display: block;
      min-height: calc(100vh - 57px);
    }
  </style>
</head>
<body>
  <nav>
    <span class="badge">Kafka</span>
    <span class="title">Payments MS — AsyncAPI</span>
    <div class="links">
      <a href="/async-api/json" target="_blank">spec JSON</a>
      <a href="/api">REST API →</a>
    </div>
  </nav>

  <asyncapi-component
    schema='${JSON.stringify(ASYNC_API_SPEC)}'
    config='{"show":{"sidebar":true,"info":true,"operations":true,"messages":true,"schemas":true},"expand":{"messageExamples":false}}'
    cssImportType="inline">
  </asyncapi-component>

  <script
    src="https://unpkg.com/@asyncapi/web-component@2.4.0/lib/asyncapi-web-component.js"
    defer>
  </script>
</body>
</html>`;
    res.send(html);
  }
}
