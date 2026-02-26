import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ListingsRedirect() {
    const { id } = useLocalSearchParams();
    // Redirect /listings/[id] to /listing/[id] (singular)
    return <Redirect href={`/listing/${id}`} />;
}
