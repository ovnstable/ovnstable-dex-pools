export const getAgent = (isMac: string) => {
  return isMac === 'true' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';
};
