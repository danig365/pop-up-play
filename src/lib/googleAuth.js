export function normalizeGoogleClientId(rawValue) {
  if (!rawValue) return '';

  const trimmed = String(rawValue).trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const normalizedPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
      return normalizedPath || parsed.hostname;
    } catch {
      const normalized = trimmed
        .replace(/^https?:\/\//, '')
        .replace(/^\/+|\/+$/g, '');

      if (!normalized.includes('/')) {
        return normalized;
      }

      const [, ...parts] = normalized.split('/');
      const fromPath = parts.join('/').replace(/^\/+|\/+$/g, '');
      return fromPath || normalized.split('/')[0];
    }
  }

  return trimmed;
}

export function isGoogleClientIdConfigured(rawValue) {
  const clientId = normalizeGoogleClientId(rawValue);
  return /\.apps\.googleusercontent\.com$/i.test(clientId);
}
