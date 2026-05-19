#!/usr/bin/env node

const DEFAULT_WEB_ORIGIN = 'https://sellr-ai.com';
const DEFAULT_API_ORIGIN = 'https://api.sellr-ai.com';

const args = new Set(process.argv.slice(2).filter((arg) => arg !== '--'));
const allowedArgs = new Set(['--help']);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));

if (unknownArgs.length > 0) {
  console.error(`Unknown option: ${unknownArgs.join(', ')}`);
  console.error('Run `pnpm smoke:production-public -- --help` for usage.');
  process.exit(1);
}

if (args.has('--help')) {
  console.log(`Sellr production public smoke

Usage:
  pnpm smoke:production-public

Environment overrides:
  SELLR_PROD_WEB_ORIGIN Defaults to https://sellr-ai.com
  SELLR_PROD_API_ORIGIN Defaults to https://api.sellr-ai.com

This smoke is intentionally non-mutating. It checks public health, the
same-origin API rewrite, and key logged-out/public HTML routes. Use the launch
smoke checklist for authenticated, upload, messaging, report, and admin flows.
`);
  process.exit(0);
}

function originFromEnv(name, fallback) {
  return (process.env[name] ?? fallback).replace(/\/$/, '');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    ...options,
  });
  const text = await response.text();
  return { response, text };
}

async function assertApiHealth(apiOrigin) {
  const url = `${apiOrigin}/health`;
  const { response, text } = await fetchText(url, {
    headers: { Accept: 'application/json' },
  });

  assert(response.ok, `${url} returned HTTP ${response.status}`);
  const body = JSON.parse(text);
  assert(body.status === 'ok', `${url} did not return status=ok`);
  console.log(`[ok] API health ${url}`);
}

async function assertLoggedOutRewrite(webOrigin) {
  const url = `${webOrigin}/api/v1/auth/me`;
  const { response, text } = await fetchText(url, {
    headers: { Accept: 'application/json' },
  });
  const body = JSON.parse(text);

  assert(
    response.status === 401,
    `${url} returned HTTP ${response.status}; expected 401 for logged-out auth`,
  );
  assert(
    body.error === 'Unauthorized',
    `${url} did not return the expected logged-out Unauthorized body`,
  );
  console.log(`[ok] same-origin auth rewrite ${url}`);
}

async function assertHtmlRoute(webOrigin, route) {
  const url = `${webOrigin}${route}`;
  const { response, text } = await fetchText(url, {
    headers: { Accept: 'text/html' },
  });
  const contentType = response.headers.get('content-type') ?? '';

  assert(response.ok, `${url} returned HTTP ${response.status}`);
  assert(
    contentType.includes('text/html'),
    `${url} returned ${contentType || 'no content type'} instead of HTML`,
  );
  assert(
    !text.includes('Internal Server Error') &&
      !text.includes('Application error') &&
      !text.includes('DNS_HOSTNAME_RESOLVED_PRIVATE'),
    `${url} rendered a generic app/server error`,
  );

  console.log(`[ok] ${route === '/' ? 'home' : route} returned HTML`);
}

async function main() {
  const webOrigin = originFromEnv('SELLR_PROD_WEB_ORIGIN', DEFAULT_WEB_ORIGIN);
  const apiOrigin = originFromEnv('SELLR_PROD_API_ORIGIN', DEFAULT_API_ORIGIN);

  console.log('Sellr production public smoke');
  console.log(`Web origin: ${webOrigin}`);
  console.log(`API origin: ${apiOrigin}`);

  await assertApiHealth(apiOrigin);
  await assertLoggedOutRewrite(webOrigin);

  for (const route of ['/', '/login', '/onboarding', '/marketplace']) {
    await assertHtmlRoute(webOrigin, route);
  }

  console.log('Public production smoke passed.');
  console.log(
    'Next: run docs/launch-smoke-checklist.md for authenticated and mutable launch flows.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
