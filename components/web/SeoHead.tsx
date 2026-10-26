import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

export const SITE_URL = 'https://naxavto.com';
export const SITE_NAME = 'Naxçıvan Avto';

// Per-page <title>, description, Open Graph and optional schema.org JSON-LD.
// The static export already carries site-wide defaults (scripts/seo-postprocess.js);
// these override them once the page renders in the browser.
export function SeoHead({ title, description, image, path, jsonLd }: {
    title: string;
    description?: string;
    image?: string;
    path?: string;
    jsonLd?: Record<string, any>;
}) {
    if (Platform.OS !== 'web') return null;
    const fullTitle =title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const url = path ? `${SITE_URL}${path}` : undefined;
    return (
        <Head>
            <title>{fullTitle}</title>
            {!!description && <meta name="description" content={description} />}
            <meta property="og:title" content={fullTitle} />
            {!!description && <meta property="og:description" content={description} />}
            {!!image && <meta property="og:image" content={image} />}
            {!!url && <meta property="og:url" content={url} />}
            {!!url && <link rel="canonical" href={url} />}
            {!!jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
        </Head>
    );
}
