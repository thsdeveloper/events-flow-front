import { BlockPost, PageBlock, Post, Redirect, Schema } from '@/types/directus-schema';
import { useDirectus } from './directus';
import { readItems, aggregate, readItem, readSingleton, withToken, QueryFilter } from '@directus/sdk';
import { RedirectError } from '../redirects';

/**
 * Fetches page data by permalink, including all nested blocks and dynamically fetching blog posts if required.
 */
export const fetchPageData = async (permalink: string, postPage = 1) => {
	const { directus, readItems } = useDirectus();
	try {
		const pageData = await directus.request(
			readItems('pages', {
				filter: { permalink: { _eq: permalink } },
				limit: 1,
				fields: [
					'title',
					'seo',
					'id',
					{
						blocks: [
							'id',
							'background',
							'collection',
							'item',
							'sort',
							'hide_block',
							{
								item: {
									block_richtext: ['id', 'tagline', 'headline', 'content', 'alignment'],
									block_gallery: ['id', 'tagline', 'headline', { items: ['id', 'directus_file', 'sort'] as any }],
									block_pricing: [
										'id',
										'tagline',
										'headline',
										{
											pricing_cards: [
												'id',
												'title',
												'description',
												'price',
												'badge',
												'features',
												'is_highlighted',
												{
													button: [
														'id',
														'label',
														'variant',
														'url',
														'type',
														{ page: ['permalink'] },
														{ post: ['slug'] },
													],
												},
											],
										},
									],
									block_hero: [
										'id',
										'tagline',
										'headline',
										'description',
										'layout',
										'image',
										{
											button_group: [
												'id',
												{
													buttons: [
														'id',
														'label',
														'variant',
														'url',
														'type',
														{ page: ['permalink'] },
														{ post: ['slug'] },
													],
												},
											],
										},
									],
									block_posts: ['id', 'tagline', 'headline', 'collection', 'limit'],
									block_events: [
										'id',
										'headline',
										'description',
										'filter_by_category',
										'filter_featured',
										'max_items',
										'show_past_events',
									],
									block_form: [
										'id',
										'tagline',
										'headline',
										{
											form: [
												'id',
												'title',
												'submit_label',
												'success_message',
												'on_success',
												'success_redirect_url',
												'is_active',
												{
													fields: [
														'id',
														'name',
														'type',
														'label',
														'placeholder',
														'help',
														'validation',
														'width',
														'choices',
														'required',
														'sort',
													],
												},
											],
										},
									],
								},
							},
						],
					},
				],
				deep: {
					blocks: { _sort: ['sort'], _filter: { hide_block: { _neq: true } } },
				},
			}),
		);

		if (!pageData.length) {
			throw new Error('Page not found');
		}

		const page = pageData[0];

		if (Array.isArray(page.blocks)) {
			for (const block of page.blocks as PageBlock[]) {
				if (
					block.collection === 'block_posts' &&
					typeof block.item === 'object' &&
					(block.item as BlockPost).collection === 'posts'
				) {
					const limit = (block.item as BlockPost).limit ?? 6;
					const posts = await directus.request<Post[]>(
						readItems('posts', {
							fields: ['id', 'title', 'description', 'slug', 'image', 'status', 'published_at'],
							filter: { status: { _eq: 'published' } },
							sort: ['-published_at'],
							limit,
							page: postPage,
						}),
					);

					(block.item as BlockPost & { posts: Post[] }).posts = posts;
				}

				// Fetch events dynamically for block_events
				if (block.collection === 'block_events' && typeof block.item === 'object' && block.item !== null) {
					try {
						const blockItem = block.item as any;
						const limit = blockItem.max_items ?? 10;
						const filterFeatured = blockItem.filter_featured ?? false;
						const showPastEvents = blockItem.show_past_events ?? false;
						const filterByCategory = blockItem.filter_by_category;

						const filter: any = { status: { _eq: 'published' } };

						if (filterFeatured) {
							filter.featured = { _eq: true };
						}

						if (!showPastEvents) {
							filter.start_date = { _gte: '$NOW' };
						}

						if (filterByCategory) {
							filter.category_id = { _eq: filterByCategory };
						}

						const events = await directus.request(
							readItems('events', {
								fields: [
									'id',
									'title',
									'slug',
									'short_description',
									'cover_image',
									'start_date',
									'end_date',
									'location_name',
									'location_address',
									'event_type',
									'is_free',
									'featured',
								],
								filter,
								sort: ['start_date'],
								limit,
							}),
						);

						(block.item as any).events = events;
					} catch (eventError) {
						console.error('🎯 Fetcher - Error fetching events:', eventError);
						console.error('🎯 Fetcher - Error details:', JSON.stringify(eventError, null, 2));
						// Set empty array to prevent component errors
						(block.item as any).events = [];
					}
				}
			}
		}

		return page;
	} catch (error) {
		console.error('Error fetching page data:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
		throw error;
	}
};

/**
 * Fetches a single event by slug
 */
export const fetchEventBySlug = async (slug: string) => {
	const { directus } = useDirectus();

	try {
		const events = await directus.request(
			readItems('events', {
				filter: { slug: { _eq: slug }, status: { _eq: 'published' } },
				fields: [
					'id',
					'title',
					'slug',
					'description',
					'short_description',
					'cover_image',
					'start_date',
					'end_date',
					'location_name',
					'location_address',
					'online_url',
					'event_type',
					'max_attendees',
					'registration_start',
					'registration_end',
					'is_free',
					'featured',
					'tags',
					{
						organizer_id: [
							'id',
							'name',
							'email',
							'phone',
							'description',
							'logo',
							'website',
							{ user_id: ['first_name', 'last_name'] }
						]
					},
					{ category_id: ['id', 'name', 'slug', 'icon', 'color', 'description'] },
					{
						tickets: [
							'id',
							'title',
							'description',
							'status',
							'quantity',
							'quantity_sold',
							'price',
							'buyer_price',
							'service_fee_type',
							'sale_start_date',
							'sale_end_date',
							'min_quantity_per_purchase',
							'max_quantity_per_purchase',
							'visibility',
							'sort',
							'allow_installments',
							'max_installments',
							'min_amount_for_installments',
						]
					},
				],
				limit: 1,
				deep: {
					tickets: {
						_sort: ['sort'],
						_filter: {
							status: { _eq: 'active' },
							visibility: { _eq: 'public' }
						}
					}
				}
			}),
		);

		if (!events.length) {
			throw new Error('Event not found');
		}

		return events[0];
	} catch (error) {
		console.error('Error fetching event:', error);
		throw new Error('Failed to fetch event');
	}
};

/**
 * Fetches global site data, header navigation, and footer navigation.
 */
export const fetchSiteData = async () => {
	const { directus } = useDirectus();

	try {
		const [globals, headerNavigation, footerNavigation] = await Promise.all([
			directus.request(
				readSingleton('globals', {
					fields: ['id', 'title', 'description', 'logo', 'logo_dark_mode', 'social_links', 'accent_color', 'favicon'],
				}),
			),
			directus.request(
				readItem('navigation', 'main', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								{
									page: ['permalink'],
									children: ['id', 'title', 'url', { page: ['permalink'] }],
								},
							],
						},
					],
					deep: { items: { _sort: ['sort'] } },
				}),
			),
			directus.request(
				readItem('navigation', 'footer', {
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								{
									page: ['permalink'],
									children: ['id', 'title', 'url', { page: ['permalink'] }],
								},
							],
						},
					],
				}),
			),
		]);

		return { globals, headerNavigation, footerNavigation };
	} catch (error) {
		console.error('Error fetching site data:', error);
		// Return minimal site data if there's a permission error
		// This allows the build to succeed even if Directus permissions are not set up

		return {
			globals: {
				id: 1,
				title: null,
				description: null,
				logo: null,
				logo_dark_mode: null,
				social_links: null,
				accent_color: null,
				favicon: null,
			},
			headerNavigation: null,
			footerNavigation: null,
		};
	}
};

/**
 * Fetches a single blog post by slug and related blog posts excluding the given ID. Handles live preview mode.
 */
export const fetchPostBySlug = async (
	slug: string,
	options?: { draft?: boolean; token?: string },
): Promise<{ post: Post | null; relatedPosts: Post[] }> => {
	const { directus } = useDirectus();
	const { draft, token } = options || {};

	try {
		const filter: QueryFilter<Schema, Post> = options?.draft
			? { slug: { _eq: slug } }
			: { slug: { _eq: slug }, status: { _eq: 'published' } };
		let postRequest = readItems<Schema, 'posts', any>('posts', {
			filter,
			limit: 1,
			fields: [
				'id',
				'title',
				'content',
				'status',
				'published_at',
				'image',
				'description',
				'slug',
				'seo',
				{
					author: ['id', 'first_name', 'last_name', 'avatar'],
				},
			],
		});

		// This is a really naive implementation of related posts. Just a basic check to ensure we don't return the same post. You might want to do something more sophisticated.
		let relatedRequest = readItems<Schema, 'posts', any>('posts', {
			filter: { slug: { _neq: slug }, status: { _eq: 'published' } },
			limit: 2,
			fields: ['id', 'title', 'slug', 'image'],
		});

		if (draft && token) {
			postRequest = withToken(token, postRequest);
			relatedRequest = withToken(token, relatedRequest);
		}

		const [posts, relatedPosts] = await Promise.all([
			directus.request<Post[]>(postRequest),
			directus.request<Post[]>(relatedRequest),
		]);

		const post: Post | null = posts.length > 0 ? (posts[0] as Post) : null;

		return { post, relatedPosts };
	} catch (error) {
		console.error('Error in fetchPostBySlug:', error);
		throw new Error('Failed to fetch blog post and related posts');
	}
};

/**
 * Fetches paginated blog posts.
 */
export const fetchPaginatedPosts = async (limit: number, page: number) => {
	const { directus } = useDirectus();
	try {
		const response = await directus.request(
			readItems('posts', {
				limit,
				page,
				sort: ['-published_at'],
				fields: ['id', 'title', 'description', 'slug', 'image', 'name'],
				filter: { status: { _eq: 'published' } },
			}),
		);

		return response;
	} catch (error) {
		console.error('Error fetching paginated posts:', error);
		throw new Error('Failed to fetch paginated posts');
	}
};

/**
 * Fetches the total number of published blog posts.
 */
export const fetchTotalPostCount = async (): Promise<number> => {
	const { directus } = useDirectus();

	try {
		const response = await directus.request(
			aggregate('posts', {
				aggregate: { count: '*' },
				filter: { status: { _eq: 'published' } },
			}),
		);

		return Number(response[0]?.count) || 0;
	} catch (error) {
		console.error('Error fetching total post count:', error);

		return 0;
	}
};

export async function fetchRedirects(): Promise<Pick<Redirect, 'url_from' | 'url_to' | 'response_code'>[]> {
	try {
		const { directus } = useDirectus();
		const response = await directus.request(
			readItems('redirects', {
				filter: {
					_and: [
						{
							url_from: { _nnull: true },
						},
						{
							url_to: { _nnull: true },
						},
					],
				},
				fields: ['url_from', 'url_to', 'response_code'],
			}),
		);

		return response || [];
	} catch (error) {
		// Return empty array if redirects collection doesn't exist or user doesn't have permission
		console.warn('Could not fetch redirects - collection may not exist or permission denied:', error);

		return [];
	}
}
