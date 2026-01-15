import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 10000,
		strictPort: false
	},
	preview: {
		port: 10000,
		strictPort: false
	},
	worker: {
		format: 'es'
	}
});
