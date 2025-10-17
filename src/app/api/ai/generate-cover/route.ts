import { NextRequest } from 'next/server';
import { withApi } from '@/lib/api';
import { AppError } from '@/lib/errors';
import OpenAI from 'openai';
import { Buffer } from 'node:buffer';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const FORM_TOKEN = process.env.DIRECTUS_FORM_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_COVER_FOLDER = process.env.AI_COVER_FOLDER || 'events';

interface GenerateCoverRequest {
	title: string;
	description?: string;
	categoryId?: string;
	short_description?: string;
}

interface CategoryData {
	id: string;
	name: string;
	description?: string;
	icon?: string;
	color?: string;
}

/**
 * Ensure folder exists in Directus, creating it if necessary
 */
async function ensureFolder(formToken: string, folderName: string): Promise<string | null> {
	try {
		// Check if folder exists
		const foldersResponse = await fetch(`${DIRECTUS_URL}/folders?filter[name][_eq]=${folderName}`, {
			headers: {
				Authorization: `Bearer ${formToken}`,
			},
		});

		if (!foldersResponse.ok) {

			return null;
		}

		const foldersData = await foldersResponse.json();
		if (Array.isArray(foldersData?.data) && foldersData.data.length > 0) {

			return foldersData.data[0].id as string;
		}

		// Create folder if it doesn't exist
		const createFolderResponse = await fetch(`${DIRECTUS_URL}/folders`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${formToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ name: folderName }),
		});

		if (!createFolderResponse.ok) {

			return null;
		}

		const folderData = await createFolderResponse.json();

		return folderData?.data?.id ?? null;
	} catch (error) {
		console.error('Error ensuring folder:', error);

		return null;
	}
}

/**
 * Fetch category data from Directus
 */
async function fetchCategoryData(categoryId: string, formToken: string): Promise<CategoryData | null> {
	try {
		const response = await fetch(`${DIRECTUS_URL}/items/event_categories/${categoryId}`, {
			headers: {
				Authorization: `Bearer ${formToken}`,
			},
		});

		if (!response.ok) {

			return null;
		}

		const data = await response.json();

		return data?.data as CategoryData || null;
	} catch (error) {
		console.error('Error fetching category:', error);

		return null;
	}
}

/**
 * Generate contextual style guidelines based on event category
 */
function getCategoryStyleGuidelines(categoryName?: string, categoryDescription?: string): string {
	const normalizedCategory = categoryName?.toLowerCase() || '';

	// Mapeamento de categorias para estilos específicos
	const categoryStyles: Record<string, string> = {
		'tecnologia': 'Modern tech aesthetic with gradients of blue, purple, and cyan. Include abstract circuit patterns, geometric shapes, or digital network visualizations. High-tech, futuristic, professional corporate style.',
		'tech': 'Modern tech aesthetic with gradients of blue, purple, and cyan. Include abstract circuit patterns, geometric shapes, or digital network visualizations. High-tech, futuristic, professional corporate style.',
		'workshop': 'Hands-on, educational atmosphere with warm colors like orange, yellow, and teal. Show collaborative workspace elements, tools, or learning materials. Approachable, energetic, and inviting style.',
		'conferência': 'Professional conference setting with sophisticated color palette of navy, gold, and white. Include stage elements, audience silhouettes, or architectural conference hall details. Corporate, prestigious, authoritative.',
		'conference': 'Professional conference setting with sophisticated color palette of navy, gold, and white. Include stage elements, audience silhouettes, or architectural conference hall details. Corporate, prestigious, authoritative.',
		'música': 'Vibrant music event with dynamic colors like electric pink, neon blue, and deep purple. Include musical instruments, sound waves, concert lights, or crowd energy. Energetic, exciting, artistic.',
		'music': 'Vibrant music event with dynamic colors like electric pink, neon blue, and deep purple. Include musical instruments, sound waves, concert lights, or crowd energy. Energetic, exciting, artistic.',
		'esporte': 'Athletic and energetic with bold colors like red, black, and lime green. Include sports equipment, action poses, stadium elements, or competition scenes. Dynamic, powerful, motivational.',
		'sports': 'Athletic and energetic with bold colors like red, black, and lime green. Include sports equipment, action poses, stadium elements, or competition scenes. Dynamic, powerful, motivational.',
		'educação': 'Educational and inspiring with friendly colors like sky blue, green, and yellow. Include books, graduation caps, classroom elements, or knowledge symbols. Trustworthy, professional, accessible.',
		'education': 'Educational and inspiring with friendly colors like sky blue, green, and yellow. Include books, graduation caps, classroom elements, or knowledge symbols. Trustworthy, professional, accessible.',
		'arte': 'Artistic and creative with rich colors like magenta, turquoise, and gold. Include paint splashes, artistic tools, gallery spaces, or abstract art elements. Sophisticated, cultural, expressive.',
		'art': 'Artistic and creative with rich colors like magenta, turquoise, and gold. Include paint splashes, artistic tools, gallery spaces, or abstract art elements. Sophisticated, cultural, expressive.',
		'negócios': 'Professional business setting with corporate colors like navy, gray, and gold. Include office elements, business graphs, handshake imagery, or cityscape. Serious, trustworthy, professional.',
		'business': 'Professional business setting with corporate colors like navy, gray, and gold. Include office elements, business graphs, handshake imagery, or cityscape. Serious, trustworthy, professional.',
		'saúde': 'Health and wellness theme with calming colors like green, white, and light blue. Include medical symbols, wellness imagery, healthy lifestyle elements. Clean, trustworthy, caring.',
		'health': 'Health and wellness theme with calming colors like green, white, and light blue. Include medical symbols, wellness imagery, healthy lifestyle elements. Clean, trustworthy, caring.',
		'food': 'Culinary experience with appetizing colors like red, orange, and brown. Include food photography, restaurant ambiance, chef elements, or dining scenes. Warm, inviting, delicious.',
		'gastronomia': 'Culinary experience with appetizing colors like red, orange, and brown. Include food photography, restaurant ambiance, chef elements, or dining scenes. Warm, inviting, delicious.',
		'entretenimento': 'Entertainment and fun with vibrant colors like hot pink, yellow, and purple. Include party elements, stage lights, celebration imagery. Exciting, fun, engaging.',
		'entertainment': 'Entertainment and fun with vibrant colors like hot pink, yellow, and purple. Include party elements, stage lights, celebration imagery. Exciting, fun, engaging.',
	};

	// Busca por correspondência parcial
	for (const [key, style] of Object.entries(categoryStyles)) {
		if (normalizedCategory.includes(key)) {

			return style;
		}
	}

	// Se houver descrição da categoria, use-a como contexto
	if (categoryDescription) {

		return `Event themed around: ${categoryDescription}. Use appropriate colors, symbols, and atmosphere that match this theme. Professional, high-quality, attention-grabbing.`;
	}

	// Estilo genérico padrão
	return 'Modern, professional event cover with bold, attention-grabbing colors. Use abstract shapes, gradients, or thematic imagery. Clean, contemporary, and engaging design.';
}

/**
 * Generate an advanced, contextual prompt for event cover generation
 * Optimized for gpt-image-1 (DALL-E 3) with focus on realistic, professional event covers
 */
function generateImagePrompt(data: GenerateCoverRequest, category?: CategoryData | null): string {
	const parts: string[] = [];

	// 1. HEADER: Define the core task with professional art direction
	parts.push('Create a professional, eye-catching event cover image in landscape format (1792x1024 pixels, 16:9 aspect ratio).');

	// 2. MAIN SUBJECT: Event title and theme
	parts.push(`\nMAIN SUBJECT: Event titled "${data.title}".`);

	// 3. CONTEXT: Add description if available
	if (data.short_description) {
		parts.push(`Short description: ${data.short_description}.`);
	}

	if (data.description && data.description.length > 0) {
		// Limita a descrição para não sobrecarregar o prompt
		const descriptionSnippet = data.description.length > 300
			? data.description.substring(0, 300) + '...'
			: data.description;
		parts.push(`Full context: ${descriptionSnippet}`);
	}

	// 4. CATEGORY-BASED STYLE GUIDELINES
	if (category) {
		parts.push(`\nCATEGORY: ${category.name}.`);
		const styleGuidelines = getCategoryStyleGuidelines(category.name, category.description || undefined);
		parts.push(`STYLE GUIDELINES: ${styleGuidelines}`);
	} else {
		parts.push('\nSTYLE GUIDELINES: ' + getCategoryStyleGuidelines());
	}

	// 5. COMPOSITION AND LAYOUT INSTRUCTIONS
	parts.push('\n--- COMPOSITION REQUIREMENTS ---');
	parts.push('• Layout: Follow the rule of thirds, with the main focal point slightly off-center.');
	parts.push('• Text space: Reserve the left third or top third of the image for text overlay (keep this area clean with solid or gradient background).');
	parts.push('• Depth: Use foreground, midground, and background elements to create visual depth.');
	parts.push('• Balance: Ensure visual balance between text-friendly space and decorative elements.');

	// 6. VISUAL STYLE AND TECHNIQUE
	parts.push('\n--- VISUAL STYLE ---');
	parts.push('• Photorealistic quality with professional photography aesthetic.');
	parts.push('• High contrast and vibrant colors that stand out on social media feeds.');
	parts.push('• Use dramatic lighting (rim lighting, cinematic lighting, or golden hour lighting).');
	parts.push('• Apply depth of field (bokeh effect) to create professional separation between subject and background.');
	parts.push('• Include subtle gradients or color overlays for cohesive color harmony.');

	// 7. TECHNICAL SPECIFICATIONS
	parts.push('\n--- TECHNICAL SPECS ---');
	parts.push('• Resolution: High-quality, print-ready (300 DPI equivalent).');
	parts.push('• Format: Landscape orientation (16:9 aspect ratio) - 1792x1024 pixels.');
	parts.push('• Color mode: RGB with rich, saturated colors optimized for digital display.');
	parts.push('• No embedded text: Leave text-friendly space but do not include actual text/typography in the image.');

	// 8. CONTENT RESTRICTIONS
	parts.push('\n--- RESTRICTIONS ---');
	parts.push('• DO NOT include any text, letters, numbers, or typography in the image itself.');
	parts.push('• DO NOT include recognizable faces or identifiable people (use silhouettes or blurred figures if needed).');
	parts.push('• DO NOT include logos, brand names, or copyrighted symbols.');
	parts.push('• AVOID cluttered or busy compositions - maintain clean, professional aesthetic.');

	// 9. MOOD AND ATMOSPHERE
	const eventTone = getEventTone(data.title, data.description);
	parts.push(`\n--- MOOD & ATMOSPHERE ---`);
	parts.push(`• Overall tone: ${eventTone}.`);
	parts.push('• Evoke emotions: Excitement, anticipation, professionalism, and trust.');
	parts.push('• Create a sense of premium quality and value.');

	// 10. INSPIRATION KEYWORDS (for better AI understanding)
	parts.push('\n--- INSPIRATION KEYWORDS ---');
	parts.push('Professional event photography, corporate event design, modern poster design, cinematic composition, editorial photography, promotional material, high-end event marketing.');

	return parts.join(' ');
}

/**
 * Determine event tone based on title and description keywords
 */
function getEventTone(title: string, description?: string): string {
	const combined = `${title} ${description || ''}`.toLowerCase();

	if (/\b(workshop|curso|aula|treinamento|tutorial)\b/.test(combined)) {

		return 'Educational, approachable, and empowering';
	}
	if (/\b(conferência|summit|congresso|symposium)\b/.test(combined)) {

		return 'Professional, authoritative, and prestigious';
	}
	if (/\b(festa|show|festival|concert|celebração)\b/.test(combined)) {

		return 'Energetic, exciting, and celebratory';
	}
	if (/\b(networking|meetup|encontro|community)\b/.test(combined)) {

		return 'Welcoming, social, and collaborative';
	}
	if (/\b(hackathon|competição|challenge|championship)\b/.test(combined)) {

		return 'Competitive, energetic, and innovative';
	}
	if (/\b(lançamento|launch|estreia|premiere)\b/.test(combined)) {

		return 'Exciting, exclusive, and anticipatory';
	}

	return 'Professional, engaging, and aspirational';
}

/**
 * Upload image buffer to Directus
 */
async function uploadToDirectus(
	imageBuffer: Buffer,
	fileName: string,
	formToken: string,
	folderId: string | null
): Promise<string> {
	const uploadFormData = new FormData();
	uploadFormData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), fileName);

	const uploadResponse = await fetch(`${DIRECTUS_URL}/files`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${formToken}`,
		},
		body: uploadFormData,
	});

	if (!uploadResponse.ok) {
		const errorText = await uploadResponse.text();
		console.error('Directus upload error:', errorText);
		throw new AppError({
			message: 'Não foi possível enviar a imagem gerada para o Directus.',
			status: uploadResponse.status,
			code: 'UPLOAD_FAILED',
			type: 'https://api.example.com/errors/upload-failed',
		});
	}

	const uploadData = await uploadResponse.json();
	const fileId = uploadData?.data?.id as string | undefined;

	if (!fileId) {
		throw new AppError({
			message: 'Upload concluído, mas não foi possível obter o ID do arquivo.',
			status: 500,
			code: 'UPLOAD_INCOMPLETE',
			type: 'https://api.example.com/errors/upload-failed',
		});
	}

	// Move file to folder if folder exists
	if (folderId) {
		await fetch(`${DIRECTUS_URL}/files/${fileId}`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${formToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ folder: folderId }),
		}).catch(error => {
			console.error('Failed to move file to folder:', error);
		});
	}

	return fileId;
}

export const POST = withApi(async (request: NextRequest) => {
	// Validate OpenAI API key
	if (!OPENAI_API_KEY) {
		throw new AppError({
			message: 'A chave de API da OpenAI não está configurada. Por favor, configure a variável de ambiente OPENAI_API_KEY.',
			status: 503,
			code: 'SERVICE_UNAVAILABLE',
			type: 'https://api.example.com/errors/service-unavailable',
		});
	}

	// Validate Directus token
	if (!FORM_TOKEN) {
		throw new AppError({
			message: 'Token de formulário do Directus não configurado.',
			status: 500,
			code: 'INVALID_CONFIGURATION',
			type: 'https://api.example.com/errors/service-unavailable',
		});
	}

	// Parse and validate request body
	const body = (await request.json()) as GenerateCoverRequest;

	if (!body.title || body.title.trim().length === 0) {
		throw new AppError({
			message: 'O título do evento é obrigatório para gerar a imagem de capa.',
			status: 400,
			code: 'VALIDATION_FAILED',
			type: 'https://api.example.com/errors/validation-failed',
			context: {
				field: 'title',
				validationCode: 'required',
			},
		});
	}

	// Fetch category data if categoryId is provided
	let category: CategoryData | null = null;
	if (body.categoryId) {
		category = await fetchCategoryData(body.categoryId, FORM_TOKEN);
		if (category) {
			console.log('Category data loaded:', category.name);
		}
	}

	// Initialize OpenAI client
	const openai = new OpenAI({
		apiKey: OPENAI_API_KEY,
	});

	// Generate the advanced, contextual prompt
	const prompt = generateImagePrompt(body, category);
	console.log('=== GENERATED PROMPT ===');
	console.log(prompt);
	console.log('========================');

	// Generate image with OpenAI DALL-E 3 (gpt-image-1)
	// Note: gpt-image-1 returns images as base64 encoded strings (b64_json)
	// Supported quality values: 'low', 'medium', 'high', 'auto'
	const imageResponse = await openai.images.generate({
		model: 'gpt-image-1',
		prompt: prompt,
		n: 1,
		size: '1536x1024', // Landscape format optimized for event covers
		quality: 'high', // Use 'high' for best quality event covers
	});

	const imageBase64 = imageResponse.data?.[0]?.b64_json;

	if (!imageBase64) {
		throw new AppError({
			message: 'A OpenAI não retornou uma imagem válida.',
			status: 500,
			code: 'GENERATION_FAILED',
			type: 'https://api.example.com/errors/generation-failed',
		});
	}

	// Convert base64 to buffer
	const imageBuffer = Buffer.from(imageBase64, 'base64');

	// Ensure folder exists
	const folderId = await ensureFolder(FORM_TOKEN, AI_COVER_FOLDER);

	// Upload to Directus
	const timestamp = Date.now();
	const fileName = `event-cover-${timestamp}.png`;
	const fileId = await uploadToDirectus(imageBuffer, fileName, FORM_TOKEN, folderId);

	return Response.json({
		fileId,
		assetUrl: `${DIRECTUS_URL}/assets/${fileId}`,
		generatedPrompt: prompt,
		category: category ? { id: category.id, name: category.name } : null,
	});
});
