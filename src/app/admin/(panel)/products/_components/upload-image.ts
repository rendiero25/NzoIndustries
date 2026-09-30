export async function uploadProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "products");

  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();

  if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
  return json.url as string;
}
