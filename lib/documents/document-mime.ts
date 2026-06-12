export function mimeTypeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (/\.(png)$/i.test(lower)) return "image/png";
  if (/\.(jpe?g)$/i.test(lower)) return "image/jpeg";
  if (/\.(gif)$/i.test(lower)) return "image/gif";
  if (/\.(webp)$/i.test(lower)) return "image/webp";
  if (/\.(xlsx)$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.(xls)$/i.test(lower)) return "application/vnd.ms-excel";
  if (/\.(docx)$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.(doc)$/i.test(lower)) return "application/msword";
  if (/\.(txt)$/i.test(lower)) return "text/plain";
  if (/\.(csv)$/i.test(lower)) return "text/csv";
  return "application/octet-stream";
}
