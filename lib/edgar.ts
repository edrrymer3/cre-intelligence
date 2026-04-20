export const EDGAR_BASE = 'https://data.sec.gov'

export async function fetchEdgarJson(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CRE Intelligence cre@example.com' },
  })
  if (!res.ok) throw new Error(`EDGAR fetch failed: ${res.status} ${url}`)
  return res.json()
}

export async function getCompanyFilings(cik: string, formType = '10-K') {
  const paddedCik = cik.padStart(10, '0')
  const url = `${EDGAR_BASE}/submissions/CIK${paddedCik}.json`
  const data = await fetchEdgarJson(url)
  // Filter to requested form type
  const filings = data.filings?.recent
  if (!filings) return []
  const results = []
  for (let i = 0; i < filings.form.length; i++) {
    if (filings.form[i] === formType) {
      results.push({
        form: filings.form[i],
        filingDate: filings.filingDate[i],
        accessionNumber: filings.accessionNumber[i],
        primaryDocument: filings.primaryDocument[i],
      })
    }
  }
  return results
}

export function getFilingUrl(cik: string, accessionNumber: string, primaryDoc: string) {
  const paddedCik = cik.padStart(10, '0')
  const accNoClean = accessionNumber.replace(/-/g, '')
  return `${EDGAR_BASE}/Archives/edgar/data/${parseInt(paddedCik)}/${accNoClean}/${primaryDoc}`
}
