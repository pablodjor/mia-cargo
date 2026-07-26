import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { MetricCard } from '@/components/ui/MetricCard'
import { ScannerInput } from '@/components/ui/ScannerInput'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Textarea } from '@/components/ui/Textarea'
import * as colors from '@/constants/colors'

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(false)
  return <div className="space-y-6 p-4 md:p-6"><h1 className="text-2xl font-bold">Sistema de diseño</h1><Card title="Colores"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(colors).map(([name, value]) => <div key={name} className="rounded border border-border p-3"><div className="mb-2 h-10 rounded" style={{ backgroundColor: typeof value === 'string' ? value : undefined }} /><strong>{name}</strong><p className="text-xs text-text-secondary">{String(value)}</p></div>)}</div></Card><Card title="Botones y badges"><div className="flex flex-wrap gap-2"><Button>Principal</Button><Button variant="secondary">Secundario</Button><Button variant="outline">Borde</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Peligro</Button><Badge tone="success">Correcto</Badge><Badge tone="danger">Error</Badge></div></Card><Card title="Estados"><div className="flex flex-wrap gap-2">{['pending','assigned','in_route','delivered','not_delivered','rescheduled','cancelled'].map((status) => <StatusBadge key={status} status={status as Parameters<typeof StatusBadge>[0]['status']} />)}</div></Card><Card title="Campos"><div className="grid gap-3 md:grid-cols-2"><Input label="Entrada" placeholder="Escribí aquí" /><SearchInput placeholder="Buscar" /><Select label="Selección" options={[{value:'one',label:'Opción uno'}]} placeholder="Elegir" /><Textarea label="Texto" placeholder="Observación" /><Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} label="Acepto los términos" /><ScannerInput /></div></Card><div className="grid gap-3 md:grid-cols-2"><MetricCard label="Métrica" value="1.248" /><Alert tone="info" title="Información">Los componentes usan los tokens del proyecto.</Alert></div></div>
}
