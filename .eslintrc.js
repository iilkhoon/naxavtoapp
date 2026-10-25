// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  // supabase/functions run on Deno (URL / npm: imports)
  ignorePatterns: ['/dist/*', '/supabase/functions/*'],
};
