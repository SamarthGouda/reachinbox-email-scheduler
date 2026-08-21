export function parseLeadEmails(csvContent: string): { emails: string[]; count: number } {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = csvContent.match(emailRegex) || [];
  const uniqueEmails = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  return {
    emails: uniqueEmails,
    count: uniqueEmails.length,
  };
}
