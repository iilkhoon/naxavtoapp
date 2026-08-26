export const formatDate = (date: string | Date | null, options?: { showMonthName?: boolean }) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  if (options?.showMonthName) {
    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
      'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
};
