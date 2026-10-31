/** Signature element: mono uppercase module code + thin double rule (see design-anchor.md) */
export function ModuleHeader({ code, title }: { code: string; title: string }) {
  return (
    <header className="mb-6">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">{code}</p>
      <div className="mt-1 border-b border-line pb-2">
        <h1 className="border-b-2 border-ink pb-2 text-2xl font-semibold leading-tight">
          {title}
        </h1>
      </div>
    </header>
  )
}
