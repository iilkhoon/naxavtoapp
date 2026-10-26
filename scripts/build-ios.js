const { spawnSync } = require('child_process');

process.env.EXPO_NO_CAPABILITY_SYNC = '1';

const args = ['build', '--platform', 'ios', '--profile', 'production', ...process.argv.slice(2)];
const result = spawnSync('eas', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EXPO_NO_CAPABILITY_SYNC: '1',
  },
});

process.exit(result.status ?? 0);
