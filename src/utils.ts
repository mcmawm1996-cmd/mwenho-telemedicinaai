export async function safeJson<T = any>(res: Response): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {} as T;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn("safeJson: Error parsing JSON from response", err);
    return {} as T;
  }
}
