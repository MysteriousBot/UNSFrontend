export const formatUuid = (uuid) => {
  if (!uuid) return null
  // Remove all hyphens from UUID
  return uuid.replace(/-/g, '')
}

export const addHyphensToUuid = (uuid) => {
  if (!uuid) return null
  // Add hyphens in standard UUID format
  return uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
} 