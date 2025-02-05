import { zod } from '$lib/adapters/zod.js';
import { fieldProxy, superForm, type SuperForm } from '$lib/client/index.js';
import { superValidate, type SuperValidated } from '$lib/superValidate.js';
import { get } from 'svelte/store';
import { merge } from 'ts-deepmerge';
import { describe, it, expect, beforeEach, test } from 'vitest';
import { z } from 'zod';
import { SuperFormError } from '$lib/errors.js';

const schema = z.object({
	name: z.string().default('Unknown'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(3),
	score: z.number().int().min(0)
});

type Schema = z.infer<typeof schema>;

function updateForm(data: Partial<Schema>, taint?: boolean | 'untaint') {
	form.form.update(
		($form) => {
			const output = merge($form, data) as Schema;
			//console.log('🚀 ~ file: superForm.test.ts:25 ~ updateForm ~ output:', output);
			return output;
		},
		{ taint }
	);
}

let validated: SuperValidated<Schema>;
let form: SuperForm<Schema>;

beforeEach(async () => {
	validated = await superValidate(zod(schema));
	form = superForm(validated, { validators: zod(schema) });
});

describe('Tainted', () => {
	let tainted: SuperForm<Schema>['tainted'];

	function checkTaint(
		data: Partial<Schema>,
		expected: Record<string, unknown>,
		taint?: boolean | 'untaint'
	) {
		updateForm(data, taint);
		expect(get(tainted)).toStrictEqual(expected);
	}

	beforeEach(async () => {
		tainted = form.tainted;
	});

	it('Should update tainted properly', () => {
		expect(get(tainted)).toBeUndefined();
		expect(form.isTainted()).toBe(false);

		checkTaint({ name: 'Test' }, { name: true });

		expect(get(form.form).name).toEqual('Test');
		expect(form.isTainted()).toBe(true);
		expect(form.isTainted('name')).toBe(true);
		expect(form.isTainted('tags')).toBe(false);

		checkTaint(
			{ tags: ['A'] },
			{
				name: true,
				tags: {
					'0': true
				}
			}
		);

		expect(form.isTainted('tags')).toBe(true);
		expect(form.isTainted('tags[0]')).toBe(true);
	});

	it('Should be able to check tainted with the tainted store', () => {
		expect(form.isTainted()).toBe(false);
		expect(form.isTainted({ name: true })).toBe(true);
		expect(form.isTainted(undefined)).toBe(false);

		tainted.set({ name: true });
		expect(form.isTainted(get(tainted))).toBe(true);
		// true since the real store is tainted:
		expect(form.isTainted(undefined)).toBe(true);

		expect(form.isTainted(get(tainted)?.name)).toBe(true);
	});

	describe('When not tainting', () => {
		it("Should not set field to undefined if field isn't tainted", () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ tags: ['A'] },
				{
					name: true,
					tags: {
						'0': undefined
					}
				},
				false
			);
		});
	});

	describe('Untainting', () => {
		it('Should set untainted field to undefined if field is tainted already', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ name: 'Test 2' },
				{
					name: true
				},
				false
			);
			checkTaint(
				{ name: 'Test 3' },
				{
					name: undefined
				},
				'untaint'
			);
		});

		it('should set the tainted field to undefined if it gets the same value as its original state', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			expect(form.isTainted('name')).toBe(true);
			checkTaint({ name: 'Unknown' }, { name: undefined });
			expect(form.isTainted('name')).toBe(false);
		});
	});
});

describe('Validate', () => {
	test('default options should update errors but not taint the form', async () => {
		form.form.update(
			($form) => {
				$form.score = -1;
				return $form;
			},
			{ taint: false }
		);
		expect(form.isTainted()).toBe(false);

		expect(await form.validate('score')).toEqual(['Number must be greater than or equal to 0']);

		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(-1);
		expect(form.isTainted()).toBe(false);
	});

	test('testing a value should update errors but not taint the form', async () => {
		expect(form.isTainted()).toBe(false);

		expect(await form.validate('score', { value: -10 })).toEqual([
			'Number must be greater than or equal to 0'
		]);

		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(-10);
		expect(form.isTainted()).toBe(false);
	});

	test('using a custom error should update form errors', async () => {
		expect(await form.validate('score', { errors: 'Score cannot be negative.' })).toBeUndefined();

		form.form.update(
			($form) => {
				$form.score = -1;
				return $form;
			},
			{ taint: false }
		);

		const scoreError = 'Score cannot be negative.';

		expect(await form.validate('score', { errors: scoreError })).toEqual([scoreError]);
		expect(get(form.errors).score).toEqual([scoreError]);
	});

	test('if setting a value, the field can be tainted', async () => {
		expect(await form.validate('score', { value: 10, taint: true })).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(10);
		expect(form.isTainted('score')).toBe(true);
	});

	test('if setting a value, the field can be tainted', async () => {
		expect(await form.validate('score', { value: 10, taint: true })).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(10);
		expect(form.isTainted('score')).toBe(true);
	});

	test('setting an invalid value, only updating the value, not the errors', async () => {
		expect(await form.validate('score', { value: -10, update: 'value' })).toEqual([
			'Number must be greater than or equal to 0'
		]);
		expect(get(form.errors).score).toBeUndefined();
		expect(get(form.form).score).toBe(-10);
		expect(form.isTainted('score')).toBe(false);
	});

	test('setting an invalid value, only updating the errors, not the value', async () => {
		expect(await form.validate('score', { value: -10, update: 'errors' })).toEqual([
			'Number must be greater than or equal to 0'
		]);
		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.form).score).toBe(0);
		expect(form.isTainted('score')).toBe(false);
	});

	test('should return the errors for a form field', async () => {
		form.form.update(($form) => {
			$form.score = -1;
			return $form;
		});

		expect(await form.validate('name')).toBeUndefined();
		expect(get(form.errors).score).toBeUndefined();
		expect(await form.validate('score')).toEqual(['Number must be greater than or equal to 0']);
		expect(get(form.errors).score).toEqual(['Number must be greater than or equal to 0']);

		expect(
			await form.validate('score', {
				value: 'test' as unknown as number
			})
		).toEqual(['Expected number, received string']);

		expect(await form.validate('score', { value: 1 })).toBeUndefined();

		expect((await form.validateForm()).data).toEqual(get(form.form));
	});
});

describe('fieldProxy with superForm', async () => {
	it('should have the taint option', () => {
		const proxy = fieldProxy(form, 'score', { taint: false });
		proxy.set(100);

		expect(get(form.form).score).toBe(100);
		expect(form.isTainted('score')).toBe(false);
		expect(form.isTainted()).toBe(false);
	});
});

describe('Nested data', () => {
	it('should make superForm throw an error if dataType is not "json"', async () => {
		const validated = await superValidate(
			zod(
				z.object({
					nested: z.object({ name: z.string() })
				})
			)
		);
		expect(() => superForm(validated)).toThrowError(SuperFormError);
		expect(() => superForm(validated, { dataType: 'json' })).not.toThrowError(SuperFormError);
	});
});

///// mockSvelte.ts (must be copy/pasted here) ////////////////////////////////

import { vi } from 'vitest';

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/stores', async () => {
	const { readable, writable } = await import('svelte/store');

	const getStores = () => ({
		navigating: readable(null),
		page: readable({ url: new URL('http://localhost'), params: {} }),
		session: writable(null),
		updated: readable(false)
	});

	const page: typeof import('$app/stores').page = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().page.subscribe(fn);
		}
	};

	const navigating: typeof import('$app/stores').navigating = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().navigating.subscribe(fn);
		}
	};

	return {
		getStores,
		navigating,
		page
	};
});
