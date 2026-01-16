import { differenceInHours, differenceInDays, format } from 'date-fns';

export const formatListingDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = differenceInHours(now, date);
  const diffDays = differenceInDays(now, date);

  if (diffHours < 24) {
    if (diffHours === 0) return 'Yeni';
    return 'Bu gün';
  }
  if (diffDays === 1) return 'Dünən';
  if (diffDays < 30) return `${diffDays} gün əvvəl`;
  
  return format(date, 'dd.MM.yyyy');
};
