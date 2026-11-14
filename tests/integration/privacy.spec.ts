import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomBytes } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = 'http://127.0.0.1:8002';
const password = randomBytes(24).toString('hex');
let directory: string;
let server: ChildProcess;

test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'access-security-browser-'));
  const environment = { ...process.env, ACCESS_SECURITY_ORIGIN:origin,
    ACCESS_SECURITY_DB:join(directory, 'demo.sqlite'), ACCESS_SECURITY_KEY:randomBytes(32).toString('base64'),
    ACCESS_TEST_PASSWORD:password };
  execFileSync('uv', ['run', '--offline', 'python', '-c',
    'import os; from pathlib import Path; from access_api.security_store import SecurityStore; s=SecurityStore(Path(os.environ["ACCESS_SECURITY_DB"]), os.environ["ACCESS_SECURITY_KEY"].encode()); s.create_account("browser-learner", os.environ["ACCESS_TEST_PASSWORD"])'],
    { env:environment, stdio:'pipe' });
  server = spawn('uv', ['run', '--offline', 'uvicorn', 'access_api.main:app', '--host', '127.0.0.1', '--port', '8002'], { env:environment, stdio:'ignore' });
  await expect.poll(async () => { try { return (await fetch(origin + '/healthz')).status; } catch { return 0; } }).toBe(200);
});
test.afterAll(async () => {
  if (server?.exitCode === null) {
    await new Promise<void>(resolve => { server.once('exit', () => resolve()); server.kill('SIGTERM'); });
  }
  if (directory) await rm(directory, { recursive:true, force:true });
});

test('privacy console supports real cookie login, saved choices, export and logout', async ({ page, context }) => {
  await page.goto(origin + '/demo/privacy');
  await page.getByLabel('Demo alias').fill('browser-learner');
  await page.locator('#login-form').getByLabel('Passphrase', { exact:true }).fill(password);
  await page.getByRole('button', { name:'Sign in', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Choose what to save' })).toBeVisible();
  const cookies = await context.cookies();
  const cookie = cookies.find(item => item.name === '__Host-access_session');
  expect(cookie?.httpOnly).toBe(true); expect(cookie?.secure).toBe(true); expect(cookie?.sameSite).toBe('Lax');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0,0]);
  await page.getByLabel('Save my language and caption-size preferences on this account').check();
  await page.getByLabel('Preferred language').selectOption('am');
  await page.getByLabel('Caption size', { exact:true }).selectOption('large');
  await page.getByRole('button', { name:'Save privacy choice' }).click();
  await expect(page.locator('#status')).toHaveText('Your privacy choice was saved.');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name:'Download my demo data' }).click();
  expect((await download).suggestedFilename()).toBe('access-demo-data.json');
  await page.getByRole('button', { name:'Sign out of this browser' }).click();
  await expect(page.getByLabel('Demo alias')).toBeFocused();
  await expect(page.locator('#console')).toBeHidden();
});

test('expired authentication preserves choices and recent-auth dialog restores focus', async ({ page, context }) => {
  await page.goto(origin + '/demo/privacy');
  await page.getByLabel('Demo alias').fill('browser-learner');
  await page.locator('#login-form').getByLabel('Passphrase', { exact:true }).fill(password);
  await page.getByRole('button', { name:'Sign in', exact:true }).click();
  await expect(page.locator('#console')).toBeVisible();
  await page.getByLabel('Caption size', { exact:true }).selectOption('extra-large');
  // Advance the test server's recent-auth timestamp while retaining real cookies,
  // CSRF validation, encryption and session rotation for the continuation.
  execFileSync('uv', ['run', '--offline', 'python', '-c',
    'import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute("UPDATE sessions SET authenticated=authenticated-301"); db.commit()', join(directory, 'demo.sqlite')],
    { stdio:'pipe' });
  const exportButton = page.getByRole('button', { name:'Download my demo data' });
  await exportButton.click();
  await expect(page.getByRole('dialog', { name:'Confirm it is you' })).toBeVisible();
  await expect(page.locator('#reauth-password')).toBeFocused();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole('button', { name:'Cancel', exact:true }).click();
  await expect(exportButton).toBeFocused();
  await expect(page.getByLabel('Caption size', { exact:true })).toHaveValue('extra-large');
  const before = (await context.cookies()).find(item => item.name === '__Host-access_session')?.value;
  await exportButton.click();
  await page.locator('#reauth-password').fill(password);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name:'Confirm and continue' }).click();
  await download;
  expect((await context.cookies()).find(item => item.name === '__Host-access_session')?.value).not.toBe(before);
  execFileSync('uv', ['run', '--offline', 'python', '-c',
    'import sqlite3,sys; db=sqlite3.connect(sys.argv[1]); db.execute("UPDATE sessions SET expires=0"); db.commit()', join(directory, 'demo.sqlite')], { stdio:'pipe' });
  await page.getByRole('button', { name:'Check session' }).click();
  await expect(page.getByRole('heading', { name:'Sign in to the security demo' })).toBeVisible();
  await page.locator('#login-form').getByLabel('Passphrase', { exact:true }).fill(password);
  await page.getByRole('button', { name:'Sign in', exact:true }).click();
  await expect(page.locator('#console')).toBeVisible();
  await expect(page.getByLabel('Caption size', { exact:true })).toHaveValue('extra-large');
});

test('session warning offers extension and account deletion has a cancellable review', async ({ page }) => {
  await page.goto(origin + '/demo/privacy');
  await page.getByLabel('Demo alias').fill('browser-learner');
  await page.locator('#login-form').getByLabel('Passphrase', { exact:true }).fill(password);
  await page.getByRole('button', { name:'Sign in', exact:true }).click();
  await expect(page.locator('#console')).toBeVisible();
  execFileSync('uv', ['run', '--offline', 'python', '-c',
    'import sqlite3,sys,time; db=sqlite3.connect(sys.argv[1]); db.execute("UPDATE sessions SET expires=?", (time.time()+119,)); db.commit()', join(directory, 'demo.sqlite')], { stdio:'pipe' });
  const check = page.getByRole('button', { name:'Check session' });
  await check.click();
  await expect(page.getByRole('button', { name:'Keep me signed in' })).toBeVisible();
  await expect(check).toBeFocused();
  await page.getByRole('button', { name:'Keep me signed in' }).click();
  await expect(page.locator('#expiry-warning')).toBeHidden();
  await page.getByRole('button', { name:'Review account deletion' }).click();
  await expect(page.getByRole('button', { name:'Keep account' })).toBeFocused();
  await page.getByRole('button', { name:'Keep account' }).click();
  await expect(page.getByRole('button', { name:'Review account deletion' })).toBeFocused();
  await page.getByRole('button', { name:'Review account deletion' }).click();
  await page.getByRole('button', { name:'Delete my demo account' }).click();
  await expect(page.locator('#status')).toHaveText('Your demo account, saved preferences and sessions have been deleted.');
});
