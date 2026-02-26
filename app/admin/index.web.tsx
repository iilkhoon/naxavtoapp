import { Redirect } from 'expo-router';

// Admin index on web → redirect to listings manager
export default function AdminIndexWeb() {
    return <Redirect href={'/admin/listings' as any} />;
}
