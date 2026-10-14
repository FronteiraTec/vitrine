import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NaoEncontrado } from '@/components/common/NaoEncontrado'

/** Endereço do painel que não existe: a tela de 404, com o caminho de volta ao dashboard. */
export function AdminNotFoundPage() {
  return (
    <NaoEncontrado
      title="Página não encontrada"
      description="Este endereço não existe no painel. Confira o link ou volte ao dashboard."
    >
      <Button asChild>
        <Link to="/admin">
          <LayoutDashboard aria-hidden="true" />
          Voltar ao dashboard
        </Link>
      </Button>
    </NaoEncontrado>
  )
}
