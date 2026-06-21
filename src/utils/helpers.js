export function nextId(records) {
  return records.length ? Math.max(...records.map((record) => record.id)) + 1 : 1
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function fullName(person) {
  if (!person) return 'Unknown'
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ')
}

export function money(value) {
  return `PHP ${Number(value || 0).toFixed(2)}`
}
