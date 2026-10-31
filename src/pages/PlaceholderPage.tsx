import { ModuleHeader } from '../components/ModuleHeader'
import { EmptyState } from '../components/EmptyState'

export function PlaceholderPage({ code, title, description }: { code: string; title: string; description: string }) {
  return (
    <div>
      <ModuleHeader code={code} title={title} />
      <EmptyState title={title + ' arrives in the next task'} description={description} />
    </div>
  )
}
