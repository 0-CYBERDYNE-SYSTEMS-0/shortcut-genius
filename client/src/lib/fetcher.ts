export class FetchError extends Error {
  info: any;
  status: number;
  constructor(message: string, info: any, status: number) {
    super(message);
    this.info = info;
    this.status = status;
  }
}

// Fetcher function for SWR that includes proper error handling
export const fetcher = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    const info = await res.json();
    const error = new FetchError(
      `An error occurred while fetching the data.`,
      info,
      res.status
    );
    throw error;
  }

  return res.json();
};

// Helper function for making POST requests
export const postData = async (url: string, data: any) => {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const info = await res.json();
    throw new FetchError(
      `An error occurred while posting data.`,
      info,
      res.status
    );
  }

  return res.json();
};
