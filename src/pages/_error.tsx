import type { NextPageContext } from "next";
import Link from "next/link";

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: 800 }}>
        {statusCode ?? "Error"}
      </h1>
      <p style={{ marginTop: "1rem", color: "#666" }}>
        {statusCode === 404
          ? "Page not found."
          : "An unexpected error occurred."}
      </p>
      <Link href="/" style={{ display: "inline-block", marginTop: "2rem", color: "#a43c12" }}>
        Back to home
      </Link>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
