<script lang="ts">
	import type { ValidationAdapter, Infer } from '$lib/adapters/adapters.js';
	import type { registerSchema } from './schema.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';
	import { superForm, type SuperForm, type SuperValidated } from '$lib/client/index.js';
	import type { Snippet } from 'svelte';

	type T = Infer<typeof registerSchema>;

	let {
		action,
		schema,
		data,
		invalidateAll,
		msg,
		fields,
		dataType = 'form'
	} = $props<{
		action: string;
		schema: ValidationAdapter<T>;
		data: SuperValidated<T>;
		invalidateAll: boolean;
		dataType?: 'form' | 'json';
		msg: Snippet<[{ status: number; text: string }]>;
		fields: Snippet<[SuperForm<T>]>;
	}>();

	/*
	export let action: string;
	export let schema: ValidationAdapter<Infer<typeof registerSchema>>;
	export let data: SuperValidated<Infer<typeof registerSchema>>;
	export let invalidateAll: boolean; // set to false to keep form data using muliple forms on a page
	export let dataType: 'form' | 'json' = 'form';
	*/

	export const _form = superForm(data, {
		dataType,
		validators: schema ? schema : undefined,
		invalidateAll,
		onError({ result }) {
			$message = {
				text: result?.error?.message,
				status: 500
			};
		},
		onUpdated({ form }) {
			if (form.valid) {
				// Successful post! Do some more client-side stuff.
			}
		}
	});

	const { form, message, enhance } = _form;
</script>

<form method="POST" {action} use:enhance>
	{@render msg($message)}
	{@render fields(_form)}
</form>

<SuperDebug data={$form} />
