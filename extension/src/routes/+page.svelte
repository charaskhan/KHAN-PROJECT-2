<script lang="ts">
	import Chat from '../components/Chat.svelte';
	import browser from 'webextension-polyfill';

	// let url: string | undefined = "";
	// async function getUrl() {
	// 	const [tab] = await browser.tabs.query({active: true, currentWindow: true})
	// 	url = tab.url;
	// }
</script>

<!-- <button on:click={getUrl}>Reveal URL</button>
<div>The current URL is {url}</div> -->

<Chat />
