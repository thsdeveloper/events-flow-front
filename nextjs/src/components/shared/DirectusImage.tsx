import { getDirectusAssetURL } from '@/lib/directus/directus-utils';
import Image, { ImageProps } from 'next/image';

export interface DirectusImageProps extends Omit<ImageProps, 'src'> {
	uuid: string;
}

const DirectusImage = ({ uuid, alt, width, height, style, ...rest }: DirectusImageProps) => {
	const src = getDirectusAssetURL(uuid);

	// If width or height is provided without the other, add auto style to maintain aspect ratio
	const imageStyle = {
		...style,
		...(width && !height ? { height: 'auto' } : {}),
		...(!width && height ? { width: 'auto' } : {}),
	};

	return <Image src={src} alt={alt} width={width} height={height} style={imageStyle} {...rest} />;
};

export default DirectusImage;
