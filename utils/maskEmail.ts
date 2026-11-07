/** "suyash.patil@gmail.com" -> "s***@gmail.com": enough to recognise the address, not enough to expose it. */
export function maskEmail(email?: string | null): string {
  if (!email) return 'your registered email';
  const at = email.lastIndexOf('@');
  if (at < 1) return 'your registered email';
  return `${email[0]}***${email.slice(at)}`;
}
