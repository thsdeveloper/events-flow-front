import { getAuthenticatedClient } from './directus';
import { uploadFiles, createItem } from '@directus/sdk';
import type { FormSubmission, FormSubmissionValue } from '@/types/directus-schema';


export const submitForm = async (
	formId: string,
	fields: { id: string; name: string; type: string }[],
	data: Record<string, any>,
) => {
	const TOKEN = process.env.DIRECTUS_FORM_TOKEN;

	if (!TOKEN) {
		throw new Error('DIRECTUS_FORM_TOKEN is not defined. Check your .env file.');
	}

	const directus = getAuthenticatedClient(TOKEN);

	try {
		const submissionValues: Omit<FormSubmissionValue, 'id'>[] = [];

		for (const field of fields) {
			const value = data[field.name];

			if (value === undefined || value === null) continue;

			if (field.type === 'file' && value instanceof File) {
				const formData = new FormData();
				formData.append('file', value);

				const uploadedFile = await directus.request(uploadFiles(formData));

				if (uploadedFile && 'id' in uploadedFile) {
					submissionValues.push({
						field: field.id,
						file: uploadedFile.id,
					});
				}
			} else {
				submissionValues.push({
					field: field.id,
					value: value.toString(),
				});
			}
		}

		const payload = {
			form: formId,
			values: submissionValues,
		};

		await directus.request(createItem('form_submissions', payload as Omit<FormSubmission, 'id'>));
	} catch (error) {
		console.error('Error submitting form:', error);
		throw new Error('Failed to submit form');
	}
};
