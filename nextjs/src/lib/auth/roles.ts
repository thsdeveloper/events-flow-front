import type { DirectusRole } from '@/types/directus-schema';

type RoleLike = Pick<DirectusRole, 'id' | 'name'> | null | undefined;

const parseList = (value?: string) =>
	value
		?.split(',')
		.map((item) => item.trim())
		.filter(Boolean) ?? [];

const ORGANIZER_ROLE_IDS = parseList(process.env.DIRECTUS_ROLE_ORGANIZER);
const ORGANIZER_ROLE_NAMES = parseList(process.env.DIRECTUS_ROLE_ORGANIZER_NAMES || 'organizer,organizador');

const CLIENT_ROLE_IDS = parseList(
	process.env.DIRECTUS_ROLE_CLIENT || process.env.DIRECTUS_ROLE_USER
);
const CLIENT_ROLE_NAMES = parseList(
	process.env.DIRECTUS_ROLE_CLIENT_NAMES || 'client,cliente,comprador'
);

const PUBLIC_ROLE_IDS = parseList(process.env.DIRECTUS_ROLE_PUBLIC);
const PUBLIC_ROLE_NAMES = parseList(
	process.env.DIRECTUS_ROLE_PUBLIC_NAMES || 'public,anônimo,anonimo'
);

const matchRole = (role: RoleLike, ids: string[], names: string[]) => {
	if (!role) {
		return false;
	}

	const roleId = role.id?.toString();
	if (roleId && ids.includes(roleId)) {
		return true;
	}

	const roleName = role.name?.toLowerCase();

	return roleName ? names.includes(roleName) : false;
};

export const directusRoles = {
	organizerIds: ORGANIZER_ROLE_IDS,
	clientIds: CLIENT_ROLE_IDS,
	publicIds: PUBLIC_ROLE_IDS,
};

export const directusRoleNames = {
	organizer: ORGANIZER_ROLE_NAMES,
	client: CLIENT_ROLE_NAMES,
	public: PUBLIC_ROLE_NAMES,
};

export const isOrganizerRole = (role: RoleLike) =>
	matchRole(role, ORGANIZER_ROLE_IDS, ORGANIZER_ROLE_NAMES);

export const isClientRole = (role: RoleLike) =>
	matchRole(role, CLIENT_ROLE_IDS, CLIENT_ROLE_NAMES) || (!isOrganizerRole(role) && !!role);

export const isPublicRole = (role: RoleLike) =>
	matchRole(role, PUBLIC_ROLE_IDS, PUBLIC_ROLE_NAMES);

export const getDefaultClientRoleId = () => CLIENT_ROLE_IDS[0] ?? null;
export const getOrganizerRoleId = () => ORGANIZER_ROLE_IDS[0] ?? null;
export const getPublicRoleId = () => PUBLIC_ROLE_IDS[0] ?? null;

export const assertRoleConfiguration = (roleId: string | null, envName: string) => {
	if (!roleId) {
		throw new Error(
			`Missing Directus role configuration: set ${envName} (comma-separated IDs supported).`
		);
	}
};
