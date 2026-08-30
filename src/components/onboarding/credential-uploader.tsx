"use client";

import { FileCheck2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type CredentialStatus = {
  credential_id: string;
  title: string;
  verification_status: string;
  submitted_at: string;
};

const mimeExtensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function CredentialUploader({
  profileId,
  credentialTypes,
  initialCredentials,
}: {
  profileId?: string;
  credentialTypes: { id: string; name: string }[];
  initialCredentials: CredentialStatus[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [credentialTypeId, setCredentialTypeId] = useState(credentialTypes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [issuingEntity, setIssuingEntity] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [credentials, setCredentials] = useState(initialCredentials);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function uploadCredential() {
    const file = fileRef.current?.files?.[0];
    const extension = file ? mimeExtensions[file.type] : undefined;
    if (!profileId) {
      setMessage("Guardá el borrador antes de cargar documentos.");
      return;
    }
    if (!file || !extension || file.size > 10 * 1024 * 1024) {
      setMessage("Elegí un PDF, JPG o PNG de hasta 10 MB.");
      return;
    }
    if (!credentialTypeId || title.trim().length < 2) {
      setMessage("Elegí el tipo de documento y agregá un título.");
      return;
    }

    setPending(true);
    setMessage(undefined);
    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId !== "string") {
      setMessage("Tu sesión venció. Volvé a ingresar.");
      setPending(false);
      return;
    }

    const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("professional-credentials")
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      setMessage("No pudimos cargar el archivo. Probá nuevamente.");
      setPending(false);
      return;
    }

    const { data: credentialId, error: registrationError } = await supabase.rpc(
      "submit_professional_credential",
      {
        p_profile_id: profileId,
        p_credential_type_id: credentialTypeId,
        p_title: title.trim(),
        p_object_path: objectPath,
        p_issuing_entity: issuingEntity.trim() || null,
        p_jurisdiction: jurisdiction.trim() || null,
        p_registration_number: registrationNumber.trim() || null,
        p_issued_on: issuedOn || null,
        p_expires_on: expiresOn || null,
      },
    );
    if (registrationError || typeof credentialId !== "string") {
      await supabase.storage.from("professional-credentials").remove([objectPath]);
      setMessage("El archivo no pudo asociarse al perfil. Volvé a intentarlo.");
      setPending(false);
      return;
    }

    setCredentials((current) => [
      {
        credential_id: credentialId,
        title: title.trim(),
        verification_status: "PENDING",
        submitted_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setTitle("");
    setIssuingEntity("");
    setJurisdiction("");
    setRegistrationNumber("");
    setIssuedOn("");
    setExpiresOn("");
    if (fileRef.current) fileRef.current.value = "";
    setMessage("Documento recibido y pendiente de revisión.");
    setPending(false);
  }

  return (
    <div>
      {credentials.length ? (
        <ul className="mb-5 space-y-2">
          {credentials.map((credential) => (
            <li key={credential.credential_id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
              <span className="flex min-w-0 items-center gap-3 font-semibold text-ink">
                <FileCheck2 className="size-4 shrink-0 text-senda" aria-hidden="true" />
                <span className="truncate">{credential.title}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-muted">{credential.verification_status === "APPROVED" ? "Aprobado" : credential.verification_status === "REJECTED" ? "Observado" : "En revisión"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink">
          Tipo de documento
          <select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" value={credentialTypeId} onChange={(event) => setCredentialTypeId(event.target.value)}>
            {credentialTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-ink">
          Título
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej.: Licenciatura en Psicología…" />
        </label>
        <label className="text-sm font-semibold text-ink sm:col-span-2">
          Institución emisora (opcional)
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" value={issuingEntity} maxLength={180} onChange={(event) => setIssuingEntity(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Jurisdicción (si corresponde)
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" value={jurisdiction} maxLength={120} onChange={(event) => setJurisdiction(event.target.value)} placeholder="Ej.: CABA…" />
        </label>
        <label className="text-sm font-semibold text-ink">
          Matrícula o registro (si corresponde)
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" value={registrationNumber} maxLength={120} onChange={(event) => setRegistrationNumber(event.target.value)} placeholder="Ej.: M.P. 12345…" />
        </label>
        <label className="text-sm font-semibold text-ink">
          Fecha de emisión (opcional)
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-ink">
          Fecha de vencimiento (opcional)
          <input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink" type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-ink sm:col-span-2">
          Archivo
          <input ref={fileRef} className="mt-2 block w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink" type="file" accept="application/pdf,image/jpeg,image/png" />
        </label>
      </div>
      <Button className="mt-4" variant="secondary" type="button" onClick={uploadCredential} disabled={pending || !profileId}>
        <Upload className="size-4" aria-hidden="true" /> {pending ? "Cargando…" : "Cargar documento"}
      </Button>
      {message ? <p className="mt-3 text-sm text-muted" role="status">{message}</p> : null}
    </div>
  );
}
