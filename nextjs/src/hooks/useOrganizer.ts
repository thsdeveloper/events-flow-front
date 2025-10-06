'use client';

import { useState, useEffect } from 'react';
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

	useEffect(() => {
		async function fetchOrganizer() {
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
		}

		fetchOrganizer();
	}, [client, user?.id]);

	const refetch = async () => {
		if (!client || !user?.id) return;

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
			}
		} catch (err) {
			console.error('Error refetching organizer:', err);
			setError(err as Error);
		} finally {
			setLoading(false);
		}
	};

	return { organizer, loading, error, refetch };
}
