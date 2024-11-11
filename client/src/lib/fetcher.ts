export class FetchError extends Error {
  info: any;
  status: number;
  constructor(message: string, info: any, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

// Fetcher function for SWR that includes credentials and handles non-200 responses
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = new FetchError(
      `A ${res.status} error occurred while fetching the data.`,
      await res.json(),
      res.status,
    );
    throw error;
  }

  return res.json();
};
