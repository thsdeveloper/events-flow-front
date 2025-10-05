import Stripe from 'stripe';

export default {
	id: 'stripe',
	handler: (router: any, context: any) => {
		const { services, getSchema, logger, env } = context;
		const { ItemsService } = services;

		// Initialize Stripe
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2024-12-18.acacia',
		});

		// Disable JSON body parsing for webhook route only
		// This middleware runs before the webhook route and stores raw body
		router.use('/webhook', (req: any, res: any, next: any) => {
			if (req.method === 'POST') {
				let data = '';
				req.setEncoding('utf8');
				req.on('data', (chunk: string) => {
					data += chunk;
				});
				req.on('end', () => {
					req.rawBody = data;
					req.body = JSON.parse(data);
					next();
				});
			} else {
				next();
			}
		});

		/**
		 * POST /stripe/connect-onboarding
		 * Create Stripe Connect account link for organizer onboarding
		 */
		router.post('/connect-onboarding', async (req, res) => {
			try {
				const { organizer_id } = req.body;

				if (!organizer_id) {
					return res.status(400).json({ error: 'organizer_id is required' });
				}

				const schema = await getSchema();
				const organizersService = new ItemsService('organizers', {
					schema,
					accountability: req.accountability,
				});

				// Get organizer data
				const organizer = await organizersService.readOne(organizer_id);

				if (!organizer) {
					return res.status(404).json({ error: 'Organizer not found' });
				}

				let accountId = organizer.stripe_account_id;

				// Create Stripe Connect account if doesn't exist
				if (!accountId) {
					const account = await stripe.accounts.create({
						type: 'express',
						country: 'BR',
						email: organizer.email,
						capabilities: {
							card_payments: { requested: true },
							transfers: { requested: true },
						},
						business_type: 'individual',
					});

					accountId = account.id;

					// Update organizer with Stripe account ID
					await organizersService.updateOne(organizer_id, {
						stripe_account_id: accountId,
					});
				}

				// Create account link for onboarding
				const accountLink = await stripe.accountLinks.create({
					account: accountId,
					refresh_url: `${process.env.PUBLIC_URL}/admin/content/organizers/${organizer_id}`,
					return_url: `${process.env.PUBLIC_URL}/admin/content/organizers/${organizer_id}`,
					type: 'account_onboarding',
				});

				return res.json({
					url: accountLink.url,
					account_id: accountId,
				});
			} catch (error: any) {
				logger.error('Stripe Connect onboarding error:', error);
				return res.status(500).json({
					error: 'Failed to create onboarding link',
					message: error.message,
				});
			}
		});

		/**
		 * POST /stripe/webhook
		 * Handle Stripe webhook events
		 */
		router.post('/webhook', async (req, res) => {
			const sig = req.headers['stripe-signature'];
			const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

			if (!sig || !webhookSecret) {
				logger.warn('Webhook signature or secret missing');
				return res.status(400).send('Webhook signature or secret missing');
			}

			let event: Stripe.Event;

			try {
				// Verify webhook signature using raw body
				// req.rawBody is set by our middleware above
				const rawBody = (req as any).rawBody || req.body;
				event = stripe.webhooks.constructEvent(
					rawBody,
					sig as string,
					webhookSecret,
				);
			} catch (err: any) {
				logger.error('Webhook signature verification failed:', err.message);
				return res.status(400).send(`Webhook Error: ${err.message}`);
			}

			const schema = await getSchema();

			try {
				// Handle different event types
				switch (event.type) {
					case 'account.updated': {
						const account = event.data.object as Stripe.Account;
						logger.info('Account updated:', account.id);

						// Find organizer by stripe_account_id
						const organizersService = new ItemsService('organizers', {
							schema,
							accountability: null, // System operation
						});

						const organizers = await organizersService.readByQuery({
							filter: {
								stripe_account_id: { _eq: account.id },
							},
							limit: 1,
						});

						if (organizers.length > 0) {
							const organizer = organizers[0];

							// Update organizer with Stripe account status
							await organizersService.updateOne(organizer.id, {
								stripe_onboarding_complete:
									account.details_submitted && account.charges_enabled,
								stripe_charges_enabled: account.charges_enabled || false,
								stripe_payouts_enabled: account.payouts_enabled || false,
							});

							logger.info('Organizer updated:', organizer.id);
						}
						break;
					}

					case 'payment_intent.succeeded': {
						const paymentIntent = event.data.object as Stripe.PaymentIntent;
						logger.info('Payment Intent succeeded:', paymentIntent.id);

						// Get registration_ids from metadata
						const registrationIds = paymentIntent.metadata.registration_ids?.split(',') || [];

						if (registrationIds.length === 0) {
							logger.warn('No registration_ids found in payment_intent metadata');
							break;
						}

						logger.info(`Processing ${registrationIds.length} registration(s)...`);

						const registrationsService = new ItemsService('event_registrations', {
							schema,
							accountability: null, // System operation
						});

						const ticketsService = new ItemsService('event_tickets', {
							schema,
							accountability: null,
						});

						const eventsService = new ItemsService('events', {
							schema,
							accountability: null,
						});

						// Process each registration
						for (const registrationId of registrationIds) {
							try {
								// Read current registration
								const registration = await registrationsService.readOne(registrationId, {
									fields: [
										'id',
										'ticket_type_id',
										'quantity',
										'status',
										'payment_status',
										'participant_name',
										'participant_email',
										'total_amount',
										'event_id',
										'event_id.title',
										'event_id.event_date',
										'event_id.location',
										'ticket_type_id.title',
										'ticket_type_id.quantity_sold',
									],
								});

								// Skip if already processed (idempotency)
								if (registration.payment_status === 'paid') {
									logger.info(`Registration ${registrationId} already processed`);
									continue;
								}

								// Generate unique ticket code
								const timestamp = Date.now().toString(36).toUpperCase();
								const random = Math.random().toString(36).substring(2, 8).toUpperCase();
								const ticketCode = `TKT-${timestamp}-${random}`;

								// Update registration
								await registrationsService.updateOne(registrationId, {
									payment_status: 'paid',
									status: 'confirmed',
									stripe_payment_intent_id: paymentIntent.id,
									ticket_code: ticketCode,
								});

								logger.info(`Registration ${registrationId} confirmed with code: ${ticketCode}`);

								// Increment quantity_sold on the ticket
								if (registration.ticket_type_id) {
									try {
										const ticketId = typeof registration.ticket_type_id === 'object'
											? registration.ticket_type_id.id
											: registration.ticket_type_id;

										const ticket = await ticketsService.readOne(ticketId, {
											fields: ['id', 'quantity_sold', 'title'],
										});

										const currentSold = ticket.quantity_sold || 0;
										const newSold = currentSold + (registration.quantity || 1);

										await ticketsService.updateOne(ticketId, {
											quantity_sold: newSold,
										});

										logger.info(
											`Ticket "${ticket.title}" quantity_sold: ${currentSold} → ${newSold}`
										);
									} catch (error: any) {
										logger.error('Error updating ticket quantity_sold:', error);
									}
								}

								// Generate QR code URL
								const baseUrl = process.env.PUBLIC_URL || 'http://localhost:8055';
								const eventId = typeof registration.event_id === 'object'
									? registration.event_id.id
									: registration.event_id;
								const verificationUrl = `${baseUrl}/verify-ticket/${eventId}/${ticketCode}`;

								// Get event and ticket details for email
								const event = typeof registration.event_id === 'object'
									? registration.event_id
									: await eventsService.readOne(eventId);

								const ticket = typeof registration.ticket_type_id === 'object'
									? registration.ticket_type_id
									: null;

								// TODO: Generate QR code image
								// For now, we'll just send the URL in the email
								// In Phase 5.1, we'll add QR code generation

								// Send confirmation email
								try {
									const mailService = new services.MailService({ schema });

									await mailService.send({
										to: registration.participant_email,
										subject: `Confirmação de Compra - ${event.title}`,
										template: {
											name: 'ticket-confirmation',
											data: {
												participant_name: registration.participant_name,
												event_title: event.title,
												event_date: new Date(event.event_date).toLocaleDateString('pt-BR', {
													weekday: 'long',
													year: 'numeric',
													month: 'long',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												}),
												event_location: event.location || '',
												ticket_type: ticket?.title || 'Ingresso',
												quantity: registration.quantity || 1,
												total_amount: registration.total_amount || 0,
												ticket_code: ticketCode,
												verification_url: verificationUrl,
											},
										},
									});

									logger.info(`Confirmation email sent to ${registration.participant_email}`);
								} catch (error: any) {
									logger.error('Error sending confirmation email:', error);
									// Don't fail the webhook if email fails
								}
							} catch (error: any) {
								logger.error(`Error processing registration ${registrationId}:`, error);
								// Continue processing other registrations
							}
						}

						logger.info('Payment processing completed');
						break;
					}

					case 'payment_intent.payment_failed': {
						const paymentIntent = event.data.object;
						logger.warn('Payment Intent failed:', paymentIntent.id);
						// TODO: Phase 4
						break;
					}

					case 'charge.refunded': {
						const charge = event.data.object;
						logger.info('Charge refunded:', charge.id);
						// TODO: Phase 5
						break;
					}

					default:
						logger.info('Unhandled event type:', event.type);
				}

				// Log webhook event to payment_transactions
				const transactionsService = new ItemsService('payment_transactions', {
					schema,
					accountability: null,
				});

				await transactionsService.createOne({
					stripe_event_id: event.id,
					stripe_object_id: event.data.object.id,
					event_type: event.type,
					status: 'succeeded',
					metadata: event.data.object,
				});

				res.json({ received: true });
			} catch (error: any) {
				logger.error('Webhook handling error:', error);
				return res.status(500).json({
					error: 'Webhook handling failed',
					message: error.message,
				});
			}
		});
	}
};
