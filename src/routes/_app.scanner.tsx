import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCode, Camera, AlertCircle, StopCircle, ArrowLeft } from "lucide-react";

const READER_ID = "qr-reader-container";
const PALLET_REGEX = /(PLT-\d{3,})/i;

function extrairCodigoPallet(raw: string): string | null {
  const texto = String(raw ?? "").trim();
  if (!texto) return null;

  // Tenta URL: extrair último segmento após /pallets/
  try {
    const url = new URL(texto);
    const match = url.pathname.match(/\/pallets\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // não é URL
  }

  // Tenta padrão PLT-xxxx em qualquer lugar do texto
  const m = texto.match(PALLET_REGEX);
  if (m?.[1]) return m[1].toUpperCase();

  // Texto puro parece codigo?
  if (/^[A-Z0-9-]{3,}$/i.test(texto)) return texto.toUpperCase();

  return null;
}

function ScannerPage() {
  const navigate = useNavigate();
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const parar = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // ignore
    }
    setScanning(false);
  }, []);

  const iniciar = useCallback(async () => {
    setErro(null);
    setUltimo(null);
    try {
      const mod = await import("html5-qrcode");
      const { Html5Qrcode } = mod;
      const instance = new Html5Qrcode(READER_ID);
      scannerRef.current = instance as unknown as {
        stop: () => Promise<void>;
        clear: () => void;
      };
      setScanning(true);

      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          setUltimo(decodedText);
          const codigo = extrairCodigoPallet(decodedText);
          if (!codigo) {
            setErro("QR Code inválido para pallet.");
            return;
          }
          setErro(null);
          await parar();
          navigate({ to: "/pallets/$codigo", params: { codigo } });
        },
        () => {
          // ignore parse errors por frame
        },
      );
    } catch (err) {
      setScanning(false);
      const msg = err instanceof Error ? err.message : "Não foi possível acessar a câmera.";
      setErro(msg);
    }
  }, [navigate, parar]);

  useEffect(() => {
    return () => {
      parar();
    };
  }, [parar]);

  const buscarManual = useCallback(() => {
    const codigo = extrairCodigoPallet(manual);
    if (!codigo) {
      setErro("QR Code inválido para pallet.");
      return;
    }
    navigate({ to: "/pallets/$codigo", params: { codigo } });
  }, [manual, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pallets">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Pallets
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escanear Pallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aponte a câmera para o QR Code do pallet para abrir o detalhe.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" /> Leitor de QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id={READER_ID}
            className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-black/5"
            style={{ minHeight: 260 }}
          />

          <div className="flex flex-wrap gap-2">
            {!scanning ? (
              <Button type="button" onClick={iniciar} className="gap-2">
                <Camera className="h-4 w-4" /> Iniciar câmera
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={parar} className="gap-2">
                <StopCircle className="h-4 w-4" /> Parar
              </Button>
            )}
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {ultimo && !erro && (
            <p className="text-xs text-muted-foreground break-all">
              Última leitura: <span className="font-mono">{ultimo}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Digitar código manualmente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Ex.: PLT-000002 ou URL completa"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarManual();
              }}
            />
            <Button type="button" onClick={buscarManual}>
              Abrir pallet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/scanner")({
  component: ScannerPage,
});
