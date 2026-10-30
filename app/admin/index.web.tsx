import { Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { visibleAdminMenu } from '../../constants/adminMenu';

// Admin index on web → the first section this admin may open (listings for most)
export default function AdminIndexWeb() {
    const { isSuperAdmin, hasModule } = useAuth();
    const first = visibleAdminMenu(isSuperAdmin, 'web', hasModule)[0]?.items[0]?.path;
    const listings = hasModule('listings') ? '/admin/listings' : null;
    return <Redirect href={(listings || first || '/') as any} />;
}
