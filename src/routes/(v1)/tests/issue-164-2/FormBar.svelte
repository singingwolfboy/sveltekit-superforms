<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import { page } from '$app/stores';

	const { form, enhance, message } = superForm($page.data.barForm, {
		resetForm: true,
		invalidateAll: false,
		taintedMessage: null
	});
</script>

<div>
	FormBar
	<div>
		{#if $message}
			<div>{$message}</div>
		{/if}
		<form method="POST" use:enhance action="?/barAction">
			<label for="name">Bar Name</label>
			<input type="text" name="name" bind:value={$form.name} />

			<div><button>Submit</button></div>
		</form>
	</div>
</div>
