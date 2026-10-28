/** Offline byte-exact permalink policy. No URL normalization or network requests. */
const patterns = {
  ig: /^https:\/\/www\.instagram\.com\/savvysave_\/p\/[A-Za-z0-9_-]+\/$/,
  threads: /^https:\/\/www\.threads\.com\/@savvysave_\/post\/[A-Za-z0-9_-]+$/,
};
export function isAllowedSourceUrl(url, platform) {
  if (typeof url !== 'string' || /\s/.test(url)) return false;
  if (platform !== undefined) return patterns[platform]?.test(url) === true;
  return Object.values(patterns).some((pattern) => pattern.test(url));
}

export function isAllowedStoreSource(store, post) {
  return isAllowedSourceUrl(post.url, post.platform);
}
