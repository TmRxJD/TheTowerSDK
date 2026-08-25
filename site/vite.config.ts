import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

function githubPagesBase(): '' | `/${string}` {
	const value = process.env.BASE_PATH ?? '';
	if (!value) return '';
	return value.startsWith('/') ? (value as `/${string}`) : `/${value}`;
}

export default defineConfig({
	server: {
		host: '127.0.0.1',
		port: 4173,
		strictPort: true
	},
	preview: {
		host: '127.0.0.1',
		port: 4173,
		strictPort: true
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: '404.html',
				precompress: false,
				strict: true
			}),
			paths: {
				base: githubPagesBase(),
				// Absolute asset URLs — relative `./_app` breaks more easily under base-path hosting.
				relative: false
			}
		})
	]
});
