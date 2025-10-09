'use client';

import { useState, useEffect, useCallback } from 'react';
import { useServerAuth } from './useServerAuth';
import { useDirectusClient } from './useDirectusClient';
import { readItems } from '@directus/sdk';
import type { Organizer } from '@/types/directus-schema';

export function useOrganizer() {
	const { user } = useServerAuth();
	const client = useDirectusClient();
	const [organizer, setOrganizer] = useState<Organizer | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchOrganizer = useCallback(async () => {
		if (!client || !user?.id) {
			setLoading(false);
			
			return;
		}

		try {
			setLoading(true);
			const organizers = await client.request(
				readItems('organizers', {
					filter: {
						user_id: {
							_eq: user.id,
						},
					},
					fields: ['*'],
					limit: 1,
				})
			);

			if (organizers && organizers.length > 0) {
				setOrganizer(organizers[0] as Organizer);
			} else {
				setOrganizer(null);
			}
		} catch (err) {
			console.error('Error fetching organizer:', err);
			setError(err as Error);
		} finally {
			setLoading(false);
		}
	}, [client, user?.id]);

	useEffect(() => {
		fetchOrganizer();
	}, [fetchOrganizer]);

	return { organizer, loading, error, refetch: fetchOrganizer };
}
