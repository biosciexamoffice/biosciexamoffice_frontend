const cachedLogoPromises = new Map();
let warned = false;

const fetchLogoAsBase64 = async (path = '/uam.jpeg') => {
  try {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (!warned) {
      console.warn('Unable to load logo for PDF export:', error);
      warned = true;
    }
    return null;
  }
};

const loadLogoBase64 = async (path = '/uam.jpeg') => {
  const key = path || '/uam.jpeg';
  if (cachedLogoPromises.has(key)) {
    return cachedLogoPromises.get(key);
  }

  const promise = (async () => {
    if (typeof window !== 'undefined' && window.__ELECTRON_DESKTOP__?.logoBase64 && (!path || path === '/uam.jpeg')) {
      return window.__ELECTRON_DESKTOP__.logoBase64;
    }

    if (!path || path === '/uam.jpeg') {
      try {
        const module = await import('../assets/logo.jpeg?base64');
        if (module?.default) {
          return module.default;
        }
      } catch {
        // ignore and fall back
      }
    }

    return fetchLogoAsBase64(key);
  })();

  cachedLogoPromises.set(key, promise);
  return promise;
};

export default loadLogoBase64;
