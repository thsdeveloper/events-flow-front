import { Suspense } from 'react';
import { requireOrganizer } from '@/lib/auth/server-auth';
import FinanceiroDashboard from './_components/FinanceiroDashboard';
import Loading from './loading';

export default async function FinanceiroPage() {
	const { organizer } = await requireOrganizer();

	return (
		<Suspense fallback={<Loading />}>
			<FinanceiroDashboard organizer={organizer} />
		</Suspense>
	);
}
