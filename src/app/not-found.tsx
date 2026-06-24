import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <Link
        href="/"
        className="text-emerald-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-emerald-300"
      >
        Go home
      </Link>
    </main>
  );
}
