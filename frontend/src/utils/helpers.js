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

export function statusPillClass(status) {
  if (["Available", "Active", "Fulfilled", "Sent"].includes(status)) {
    return "bg-emerald-50 text-emerald-700"
  }

  if (["Disposed", "Failed", "Inactive"].includes(status)) {
    return "bg-red-50 text-red-700"
  }

  if (["Pending", "Pending Lab"].includes(status)) {
    return "bg-amber-50 text-amber-700"
  }

  if (["Pending Post-Test", "Pasteurized", "Passed"].includes(status)) {
    return "bg-blue-50 text-blue-700"
  }

  if (["Skipped", "Not recorded", "Not scheduled", "Not set"].includes(status)) {
    return "bg-slate-100 text-slate-600"
  }

  return "bg-slate-100 text-slate-600"
}

export function resultPillClass(result) {
  if (result === "Passed") return "bg-emerald-50 text-emerald-700"
  if (result === "Failed") return "bg-red-50 text-red-700"

  return statusPillClass(result)
}
