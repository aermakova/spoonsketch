// Web storage backend — localStorage wrapped to match AsyncStorage interface.
// Metro picks this file on web; canvasStorage.native.ts is used on iOS/Android.
const storage = {
  getItem: (key: string) => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); }
    catch { /* quota exceeded or private browsing — silently skip */ }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); }
    catch { /* ignore */ }
    return Promise.resolve();
  },
};

export default storage;
