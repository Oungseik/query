import { QueriesObserver } from '@tanstack/query-core';
import { untrack } from 'svelte';
import { useIsRestoring } from './useIsRestoring.js';
import { createRawRef } from './containers.svelte.js';
import { useQueryClient } from './useQueryClient.js';
export function createQueries(createQueriesOptions, queryClient) {
    const client = $derived(useQueryClient(queryClient?.()));
    const isRestoring = useIsRestoring();
    const { queries, combine } = $derived.by(createQueriesOptions);
    const resolvedQueryOptions = $derived(queries.map((opts) => {
        const resolvedOptions = client.defaultQueryOptions(opts);
        // Make sure the results are already in fetching state before subscribing or updating options
        resolvedOptions._optimisticResults = isRestoring.current
            ? 'isRestoring'
            : 'optimistic';
        return resolvedOptions;
    }));
    const observer = $derived(new QueriesObserver(client, untrack(() => resolvedQueryOptions), untrack(() => combine)));
    function createResult() {
        const [_, getCombinedResult, trackResult] = observer.getOptimisticResult(resolvedQueryOptions, combine);
        return getCombinedResult(trackResult());
    }
    // @ts-expect-error - the crazy-complex TCombinedResult type doesn't like being called an array
    // svelte-ignore state_referenced_locally
    const [results, update] = createRawRef(createResult());
    $effect(() => {
        const unsubscribe = isRestoring.current
            ? () => undefined
            : observer.subscribe(() => update(createResult()));
        return unsubscribe;
    });
    $effect.pre(() => {
        observer.setQueries(resolvedQueryOptions, {
            combine,
        });
        update(createResult());
    });
    return results;
}
