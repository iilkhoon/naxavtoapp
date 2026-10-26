import React from 'react';
import { AdminHub } from '../components/admin/AdminHub';

// Hidden admin menu, opened as a sheet from the contact tab footer
export default function MenuScreen() {
  return <AdminHub presentation="sheet" />;
}
