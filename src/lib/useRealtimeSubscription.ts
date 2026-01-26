'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
    table: string;
    schema?: string;
    event?: PostgresEvent;
}

/**
 * Custom hook for Supabase Realtime subscriptions
 * 
 * @param tables - Array of table configs to subscribe to
 * @param onDataChange - Callback when any subscribed table changes
 * @param enabled - Whether subscriptions are active (default: true)
 */
export function useRealtimeSubscription(
    tables: SubscriptionConfig[],
    onDataChange: () => void,
    enabled: boolean = true
) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const callbackRef = useRef(onDataChange);
    const supabase = useMemo(() => createClient(), []);

    // Always keep the latest callback in ref
    useEffect(() => {
        callbackRef.current = onDataChange;
    }, [onDataChange]);

    // Memoize the tables key to avoid unnecessary re-subscriptions
    const tablesKey = useMemo(
        () => tables.map(t => `${t.table}-${t.event || '*'}`).join(','),
        [tables]
    );

    useEffect(() => {
        if (!enabled || tables.length === 0) return;

        // Create a single channel for all table subscriptions
        const channelName = `realtime-${Date.now()}`;
        let channel = supabase.channel(channelName);

        // Add subscription for each table
        tables.forEach(({ table, schema = 'public', event = '*' }) => {
            channel = (channel as any).on(
                'postgres_changes',
                {
                    event,
                    schema,
                    table,
                },
                (payload: any) => {
                    console.log(`[Realtime] ${table} changed:`, payload.eventType);
                    // Use ref to always call the latest callback
                    callbackRef.current();
                }
            );
        });

        // Subscribe to the channel
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Subscribed to: ${tables.map(t => t.table).join(', ')}`);
            } else if (status === 'CHANNEL_ERROR') {
                // Realtime not enabled for these tables - this is OK, we have fallback refresh
                console.warn('[Realtime] Subscription failed - tables may not have Realtime enabled in Supabase Dashboard. Data will still update via manual refresh.');
            }
        });

        channelRef.current = channel;

        // Cleanup on unmount or when dependencies change
        return () => {
            if (channelRef.current) {
                console.log('[Realtime] Unsubscribing...');
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [enabled, tablesKey, supabase]);
}

/**
 * Simplified hook for single table subscription
 */
export function useTableRealtime(
    table: string,
    onDataChange: () => void,
    enabled: boolean = true
) {
    useRealtimeSubscription([{ table }], onDataChange, enabled);
}

