"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui" }}>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
