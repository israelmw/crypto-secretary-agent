export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Crypto Operations Secretary
        </h1>
        <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
          This agent is available only via Telegram. Web chat is disabled.
        </p>
        <a
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm font-medium"
          href="https://t.me/EveAsistentbot"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open @EveAsistentbot
        </a>
      </div>
    </main>
  );
}
