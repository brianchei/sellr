#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const args = new Set(process.argv.slice(2).filter((arg) => arg !== '--'));
const allowedArgs = new Set(['--dry-run', '--help']);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));

if (unknownArgs.length > 0) {
  console.error(`Unknown option: ${unknownArgs.join(', ')}`);
  console.error('Run `pnpm slc:ready -- --help` for usage.');
  process.exit(1);
}

if (args.has('--help')) {
  console.log(`Sellr SLC release readiness

Usage:
  pnpm slc:ready
  pnpm slc:ready -- --dry-run

Requirements:
  - Redis and Supabase/Postgres are running.
  - API dev server is reachable at the smoke API base URL.
  - Web dev server is reachable at the smoke web base URL.

Environment overrides:
  SELLR_SMOKE_API_BASE_URL   Defaults to http://localhost:3000/api/v1
  SELLR_SMOKE_WEB_BASE_URL   Defaults to http://localhost:3000
  SELLR_SMOKE_OTP            Defaults to 000000
`);
  process.exit(0);
}

const dryRun = args.has('--dry-run');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const phases = [
  {
    name: 'Demo data',
    steps: [
      {
        label: 'Reset seeded demo data',
        command: pnpm,
        args: ['--filter', '@sellr/api', 'exec', 'prisma', 'db', 'seed'],
      },
    ],
  },
  {
    name: 'SLC smoke tests',
    steps: [
      { label: 'Seller lifecycle smoke', command: pnpm, args: ['smoke:seller'] },
      { label: 'Buyer contact smoke', command: pnpm, args: ['smoke:buyer'] },
      {
        label: 'Authenticated web route smoke',
        command: pnpm,
        args: ['smoke:web'],
      },
    ],
  },
  {
    name: 'Contract checks',
    steps: [
      {
        label: 'Shared package typecheck',
        command: pnpm,
        args: ['--filter', '@sellr/shared', 'typecheck'],
      },
      {
        label: 'API client typecheck',
        command: pnpm,
        args: ['--filter', '@sellr/api-client', 'typecheck'],
      },
    ],
  },
  {
    name: 'API checks',
    steps: [
      {
        label: 'API lint',
        command: pnpm,
        args: ['--filter', '@sellr/api', 'lint'],
      },
      {
        label: 'API typecheck',
        command: pnpm,
        args: ['--filter', '@sellr/api', 'typecheck'],
      },
      {
        label: 'API tests',
        command: pnpm,
        args: ['--filter', '@sellr/api', 'test'],
      },
      {
        label: 'API build',
        command: pnpm,
        args: ['--filter', '@sellr/api', 'build'],
      },
    ],
  },
  {
    name: 'Web checks',
    steps: [
      {
        label: 'Web lint',
        command: pnpm,
        args: ['--filter', '@sellr/web', 'lint'],
      },
      {
        label: 'Web typecheck',
        command: pnpm,
        args: ['--filter', '@sellr/web', 'typecheck'],
      },
      {
        label: 'Web production build',
        command: pnpm,
        args: ['--filter', '@sellr/web', 'build'],
      },
    ],
  },
];

function printPlan() {
  for (const phase of phases) {
    console.log(`\n${phase.name}`);
    for (const step of phase.steps) {
      console.log(`  - ${step.command} ${step.args.join(' ')}`);
    }
  }
}

function runStep(step) {
  console.log(`\n> ${step.label}`);
  console.log(`$ ${step.command} ${step.args.join(' ')}`);

  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`\nFailed to start: ${step.label}`);
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\nSLC readiness failed at: ${step.label}`);
    console.error('Fix the blocker above, then rerun `pnpm slc:ready`.');
    process.exit(result.status ?? 1);
  }
}

console.log('Sellr SLC release readiness');
console.log(
  'This command expects Redis, Supabase/Postgres, API, and web to already be running locally.',
);

if (dryRun) {
  printPlan();
  process.exit(0);
}

for (const phase of phases) {
  console.log(`\n== ${phase.name} ==`);
  for (const step of phase.steps) {
    runStep(step);
  }
}

console.log('\nSLC readiness passed.');
