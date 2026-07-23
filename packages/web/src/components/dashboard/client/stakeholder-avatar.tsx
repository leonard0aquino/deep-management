"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function StakeholderAvatar({
  contactId,
  name,
  photoUrl,
}: {
  contactId: string;
  name: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(photoUrl);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${contactId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase
        .from("client_contacts")
        .update({ photo_url: data.publicUrl })
        .eq("id", contactId);
      setPreview(data.publicUrl);
      router.refresh();
    }
    setUploading(false);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
      title="Alterar foto"
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
      <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex">
        <Camera className="h-3.5 w-3.5" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
    </button>
  );
}
