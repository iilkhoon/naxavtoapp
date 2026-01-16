import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'naxavto_favorites';

export const getFavorites = async (): Promise<string[]> => {
  try {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Error reading favorites', e);
    return [];
  }
};

export const toggleFavorite = async (id: string): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    const index = favorites.indexOf(id);
    let newFavorites;
    let isFav;
    
    if (index >= 0) {
      newFavorites = favorites.filter(favId => favId !== id);
      isFav = false;
    } else {
      newFavorites = [...favorites, id];
      isFav = true;
    }
    
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return isFav;
  } catch (e) {
    console.error('Error toggling favorite', e);
    return false;
  }
};
