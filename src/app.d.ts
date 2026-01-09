// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: number;
				username: string;
				role: string;
				full_name: string;
				can_export_spending: number;
			};
			locale: string;
			debug?: {
				version: string;
				loadTime: string;
				dbSize: string;
				memory: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
