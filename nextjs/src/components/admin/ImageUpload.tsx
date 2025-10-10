'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
	value?: string | null;
	onChange: (fileId: string | null) => void;
	label?: string;
	description?: string;
	required?: boolean;
	folder?: string;
}

export interface ImageUploadRef {
	uploadFile: () => Promise<string | null>;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
	value,
	onChange,
	label = 'Imagem',
	description,
	required = false,
	folder = 'events',
}, ref) => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(
		value && value !== 'local-file'
			? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${value}`
			: null
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Expose upload method to parent
	useImperativeHandle(ref, () => ({
		uploadFile: async () => {
			// If no file is selected locally, check if we already have a valid UUID
			if (!selectedFile) {
				// Only return the value if it's a valid UUID (not 'local-file')
				if (value && value !== 'local-file') {
					return value;
				}

				return null;
			}

			try {
				const formData = new FormData();
				formData.append('file', selectedFile);

				const response = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
					method: 'POST',
					body: formData,
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
				}

				const data = await response.json();
				onChange(data.fileId);

				return data.fileId;
			} catch (error) {
				console.error('Error uploading image:', error);
				throw error;
			}
		},
	}));

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Por favor, selecione apenas arquivos de imagem');

			return;
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			alert('O arquivo deve ter no máximo 5MB');

			return;
		}

		// Store file for later upload
		setSelectedFile(file);

		// Create local preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setPreview(reader.result as string);
		};
		reader.readAsDataURL(file);

		onChange('local-file');
	};

	useEffect(() => {
		if (value && value !== 'local-file') {
			setPreview(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${value}`);
			setSelectedFile(null);
		}

		if (!value) {
			setPreview(null);
			setSelectedFile(null);
		}
	}, [value]);

	const handleRemove = () => {
		setPreview(null);
		setSelectedFile(null);
		onChange(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				{label} {required && <span className="text-red-500">*</span>}
			</label>

			<div className="space-y-2">
				{preview ? (
					<div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
						<Image src={preview} alt="Preview" fill className="object-cover" />
						<button
							type="button"
							onClick={handleRemove}
							className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
						>
							<X className="size-3" />
						</button>
					</div>
				) : (
					<div
						onClick={handleClick}
						className="relative w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
					>
						<ImageIcon className="size-8 text-gray-400" />
						<p className="text-sm text-gray-600 dark:text-gray-400">Clique para selecionar</p>
						<p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
					</div>
				)}

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					className="hidden"
				/>
			</div>

			{description && (
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
			)}
		</div>
	);
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;
