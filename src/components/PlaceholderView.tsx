export function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="view">
      <h1>{title}</h1>
      <p className="empty">À venir.</p>
    </div>
  )
}
