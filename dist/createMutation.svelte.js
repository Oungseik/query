import { onDestroy } from 'svelte';
import { MutationObserver, notifyManager } from '@tanstack/query-core';
import { useQueryClient } from './useQueryClient.js';
/**
 * @param options - A function that returns mutation options
 * @param queryClient - Custom query client which overrides provider
 */
export function createMutation(options, queryClient) {
    const client = useQueryClient(queryClient?.());
    const observer = $derived(new MutationObserver(client, options()));
    const mutate = $state((variables, mutateOptions) => {
        observer.mutate(variables, mutateOptions).catch(noop);
    });
    $effect.pre(() => {
        observer.setOptions(options());
    });
    let result = $state(() => observer.getCurrentResult());
    const unsubscribe = observer.subscribe((val) => {
        notifyManager.batchCalls(() => {
            result = () => val;
        })();
    });
    onDestroy(() => {
        unsubscribe();
    });
    // @ts-expect-error
    return new Proxy(() => result(), {
        get: (_, prop) => {
            const r = {
                ...result(),
                mutate,
                mutateAsync: result().mutate,
            };
            if (prop == 'value')
                return r;
            // @ts-expect-error
            return r[prop];
        },
    });
}
function noop() { }
