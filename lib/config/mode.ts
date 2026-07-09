export type CryptoApiMode = "demo" | "sandbox" | "read_only" | "production";

export function getCryptoApiMode(): CryptoApiMode {
  const mode = (process.env.CRYPTO_API_MODE ?? "sandbox").toLowerCase();
  if (mode === "demo" || mode === "sandbox" || mode === "read_only" || mode === "production") {
    return mode;
  }
  return "sandbox";
}

export function isReadOnlyMode(): boolean {
  return getCryptoApiMode() === "read_only";
}

export function isSandboxOrDemo(): boolean {
  const mode = getCryptoApiMode();
  return mode === "sandbox" || mode === "demo";
}

export function assertMoneyMovementAllowed(): void {
  const mode = getCryptoApiMode();
  if (mode === "production") {
    throw new Error(
      "Production money movement is disabled in this demo. Set CRYPTO_API_MODE to sandbox or demo for simulated operations only.",
    );
  }
  if (mode === "read_only") {
    throw new Error(
      "Money movement is blocked in read_only mode. This demo only supports simulated transfers after explicit approval.",
    );
  }
}

export function getModeLabel(): string {
  const mode = getCryptoApiMode();
  const labels: Record<CryptoApiMode, string> = {
    demo: "demo (mock data, simulated transfers only)",
    sandbox: "sandbox (read-only/sandbox APIs, simulated transfers only)",
    read_only: "read_only (no writes, no transfers)",
    production: "production (BLOCKED — money movement disabled in this demo)",
  };
  return labels[mode];
}
