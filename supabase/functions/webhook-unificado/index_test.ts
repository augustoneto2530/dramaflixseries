import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { isAuthorized } from './index.ts';

Deno.test('accepts an identical webhook secret', () => {
  assertEquals(isAuthorized('a'.repeat(40), 'a'.repeat(40)), true);
});

Deno.test('rejects a different webhook secret', () => {
  assertEquals(isAuthorized('a'.repeat(40), 'b'.repeat(40)), false);
});

Deno.test('rejects a secret with a different length', () => {
  assertEquals(isAuthorized('short', 'a'.repeat(40)), false);
});