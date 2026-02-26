import { Redirect } from 'expo-router';

// Native admin index → redirect to listings
export default function AdminIndex() {
    return <Redirect href={'/admin/listings' as any} />;
}
