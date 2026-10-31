import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
      <div className="card p-8 text-center">
        <p className="font-serif text-4xl italic text-body-strong">Nothing here.</p>
        <p className="mt-2 text-sm text-body">That page doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary mt-6">Back home</Link>
      </div>
    </main>
  );
}
