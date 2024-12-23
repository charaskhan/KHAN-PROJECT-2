<script lang="ts">
	import { faker } from '@faker-js/faker';
	import { onMount } from 'svelte/internal';

	const lorem = faker.lorem.paragraph();
	let currentMessage = '';

	interface MessageFeed {
		id: number;
		host: boolean;
		avatar: number;
		name: string;
		timestamp: string;
		message: string;
		color: string;
	}
	let messageFeed: MessageFeed[] = [
		{
			id: 0,
			host: true,
			avatar: 48,
			name: 'Jane',
			timestamp: 'Yesterday @ 2:30pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 1,
			host: false,
			avatar: 14,
			name: 'Michael',
			timestamp: 'Yesterday @ 2:45pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 2,
			host: true,
			avatar: 48,
			name: 'Jane',
			timestamp: 'Yesterday @ 2:50pm',
			message: lorem,
			color: 'variant-soft-primary'
		},
		{
			id: 3,
			host: false,
			avatar: 14,
			name: 'Michael',
			timestamp: 'Yesterday @ 2:52pm',
			message: lorem,
			color: 'variant-soft-primary'
		}
	];

	let elemChat: HTMLElement;
	function scrollChatBottom(behavior?: ScrollBehavior): void {
		elemChat.scrollTo({ top: elemChat.scrollHeight, behavior });
	}

	function getCurrentTimestamp(): string {
		return new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
	}

	function addMessage(): void {
		const newMessage = {
			id: messageFeed.length,
			host: true,
			avatar: 48,
			name: 'Jane',
			timestamp: `Today @ ${getCurrentTimestamp()}`,
			message: currentMessage,
			color: 'variant-soft-primary'
		};
		// Update the message feed
		messageFeed = [...messageFeed, newMessage];
		// Clear prompt
		currentMessage = '';
		// Smooth scroll to bottom
		// Timeout prevents race condition
		setTimeout(() => {
			scrollChatBottom('smooth');
		}, 0);
	}

	function onPromptKeydown(event: KeyboardEvent): void {
		if (['Enter'].includes(event.code)) {
			event.preventDefault();
			addMessage();
		}
	}

	// When DOM mounted, scroll to bottom
	onMount(() => {
		scrollChatBottom();
	});
</script>

<section class="card">
	<div class="grid grid-row-[1fr_auto]">
		<!-- Conversation -->
		<section bind:this={elemChat} class="max-h-[500px] p-4 overflow-y-auto space-y-4">
			{#each messageFeed as bubble}
				{#if bubble.host === true}
					<div class="grid grid-cols-[auto_1fr] gap-2">
						<div class="card p-4 variant-soft rounded-tl-none space-y-2">
							<header class="flex justify-between items-center">
								<p class="font-bold">Seera</p>
							</header>
							<p>{bubble.message}</p>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-[1fr_auto] gap-2">
						<div class="card p-4 rounded-tr-none space-y-2 {bubble.color}">
							<header class="flex justify-between items-center">
								<p class="font-bold">Me</p>
							</header>
							<p>{bubble.message}</p>
						</div>
					</div>
				{/if}
			{/each}
		</section>
		<!-- Prompt -->
		<section class="border-t border-surface-500/30 p-4">
			<div
				class="input-group input-group-divider grid-cols-[auto_1fr_auto] rounded-container-token"
			>
				<textarea
					bind:value={currentMessage}
					class="bg-transparent border-0 ring-0"
					name="prompt"
					id="prompt"
					placeholder="Write a message..."
					rows="1"
					on:keydown={onPromptKeydown}
				/>
				<button
					class={currentMessage ? 'variant-filled-primary' : 'input-group-shim'}
					on:click={addMessage}
				>
					<i class="fa-solid fa-paper-plane" />
				</button>
			</div>
		</section>
	</div>
</section>
