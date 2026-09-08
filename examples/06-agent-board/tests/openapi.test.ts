// Cottonmouth's file is checked here. Structure only. This is not a full
// OpenAPI validator. It asks the four questions a reviewer would ask.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SPEC_PATH = fileURLToPath(new URL('../openapi/messages.openapi.json', import.meta.url));

function loadSpec(): any {
  return JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
}

/** Every "$ref" string anywhere in the document. */
function collectRefs(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === '$ref' && typeof value === 'string') out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

describe('the OAS document', () => {
  it('is OpenAPI 3.1', () => {
    const spec = loadSpec();
    expect(String(spec.openapi)).toMatch(/^3\.1\./);
  });

  it('names itself', () => {
    const spec = loadSpec();
    expect(spec.info?.title).toBeTruthy();
    expect(spec.info?.version).toBeTruthy();
  });

  it('describes the two message paths', () => {
    const spec = loadSpec();
    expect(Object.keys(spec.paths ?? {}).sort()).toEqual(['/messages', '/messages/{id}']);
  });

  it('describes exactly the three operations', () => {
    const spec = loadSpec();
    const ops: string[] = [];
    for (const [route, item] of Object.entries<any>(spec.paths ?? {})) {
      for (const method of METHODS) {
        if (item?.[method]) ops.push(method.toUpperCase() + ' ' + route);
      }
    }
    expect(ops.sort()).toEqual(['GET /messages', 'GET /messages/{id}', 'POST /messages']);
  });

  it('gives every operation a described 2xx response', () => {
    const spec = loadSpec();
    for (const [route, item] of Object.entries<any>(spec.paths ?? {})) {
      for (const method of METHODS) {
        const op = item?.[method];
        if (!op) continue;
        const codes = Object.keys(op.responses ?? {});
        expect(codes.length, method + ' ' + route + ' has no responses').toBeGreaterThan(0);
        expect(codes.some((c) => c.startsWith('2')), method + ' ' + route).toBe(true);
        for (const code of codes) {
          expect(op.responses[code].description, method + ' ' + route + ' ' + code).toBeTruthy();
        }
      }
    }
  });

  it('says how a message is created and what comes back', () => {
    const spec = loadSpec();
    const post = spec.paths?.['/messages']?.post;
    expect(post?.requestBody?.content?.['application/json']?.schema).toBeTruthy();
    expect(post?.responses?.['201']).toBeTruthy();
    expect(spec.paths?.['/messages/{id}']?.get?.responses?.['404']).toBeTruthy();
  });

  it('resolves every $ref into components.schemas', () => {
    const spec = loadSpec();
    const refs = collectRefs(spec);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith('#/components/schemas/'), 'unsupported $ref: ' + ref).toBe(true);
      const name = ref.slice('#/components/schemas/'.length);
      expect(spec.components?.schemas?.[name], 'dangling $ref: ' + ref).toBeTruthy();
    }
  });

  it('carries the schemas the operations lean on', () => {
    const spec = loadSpec();
    const schemas = Object.keys(spec.components?.schemas ?? {});
    expect(schemas).toEqual(expect.arrayContaining(['Message', 'CreateMessage', 'MessageKind']));
  });

  it('gives the path parameter a name and marks it required', () => {
    const spec = loadSpec();
    const params = spec.paths?.['/messages/{id}']?.get?.parameters ?? [];
    const id = params.find((p: any) => p.in === 'path');
    expect(id?.name).toBe('id');
    expect(id?.required).toBe(true);
  });
});
