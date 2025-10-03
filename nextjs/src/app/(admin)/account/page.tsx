import { Metadata } from 'next';
import { AccountPageContent } from '@/components/account/AccountPageContent';

export const metadata: Metadata = {
	title: 'Minha Conta',
	description: 'Gerencie suas informações pessoais e de organizador',
};

export default function AccountPage() {
	return <AccountPageContent />;
}
