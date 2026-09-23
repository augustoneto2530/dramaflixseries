const IMAGE_FILE_PATTERN = /\.(?:png|jpe?g|webp|gif)(?:\?|#|$)/i;

export function isPlayableVideoUrl(url: string | null | undefined): url is string {
  return Boolean(url && !IMAGE_FILE_PATTERN.test(url));
}