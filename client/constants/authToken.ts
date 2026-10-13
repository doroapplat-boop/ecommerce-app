/** Fresh JWT for API calls (helps after app idle / Expo Go cache) */
export async function getApiToken(
    getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
): Promise<string | null> {
    try {
        const fresh = await getToken({ skipCache: true });
        if (fresh) return fresh;
    } catch {
        // fall through
    }
    try {
        return await getToken();
    } catch {
        return null;
    }
}
