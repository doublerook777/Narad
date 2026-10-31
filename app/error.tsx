"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-medium tracking-tight">Something broke</h1>
        <p className="mt-2 text-sm text-body">The page hit an error. Your room is still on the server, so trying again usually works.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-primary" onClick={reset}>Try again</button>
          <Link href="/" className="btn-outline">Home</Link>
        </div>
      </div>
    </main>
  );
}
