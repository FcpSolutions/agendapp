import { useState } from 'react'
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  ClipboardList
} from 'lucide-react'

// Páginas
import DashboardHome from '@/pages/DashboardHome'
import Pacientes from '@/pages/Pacientes'
import Agenda from '@/pages/Agenda'
import FichaClinica from '@/pages/FichaClinica'
import Evolucao from '@/pages/Evolucao'
import Receita from '@/pages/Receita'
import Despesas from '@/pages/Despesas'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import Documentos from '@/pages/Documentos'

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Users size={20} />, label: 'Pacientes', path: '/dashboard/pacientes' },
    { icon: <Calendar size={20} />, label: 'Agenda', path: '/dashboard/agenda' },
    { icon: <FileText size={20} />, label: 'Ficha Clínica', path: '/dashboard/ficha-clinica' },
    { icon: <ClipboardList size={20} />, label: 'Evolução', path: '/dashboard/evolucao' },
    { icon: <DollarSign size={20} />, label: 'Despesas', path: '/dashboard/despesas' },
    { icon: <BarChart2 size={20} />, label: 'Relatórios', path: '/dashboard/relatorios' },
    { icon: <Settings size={20} />, label: 'Configurações', path: '/dashboard/configuracoes' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Menu Lateral */}
      <aside className={`bg-gray-900 text-white ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out`}>
        <div className="p-4 flex justify-between items-center">
          {!isCollapsed && <h2 className="text-xl font-bold">Dr. Calendário</h2>}
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-gray-700 hover:text-white bg-gray-800"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu size={20} />
          </Button>
        </div>
        <Separator className="bg-gray-800" />
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full justify-start text-white bg-transparent hover:bg-gray-800 hover:text-white ${
                isCollapsed ? 'px-2' : 'px-4'
              } ${location.pathname === item.path ? 'bg-gray-800' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              {!isCollapsed && <span className="ml-2">{item.label}</span>}
            </Button>
          ))}
          <Separator className="bg-gray-800 my-4" />
          <Button
            variant="ghost"
            className="w-full justify-start text-white bg-transparent hover:bg-gray-800 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="ficha-clinica" element={<FichaClinica />} />
            <Route path="evolucao" element={<Evolucao />} />
            <Route path="receitas" element={<Receita />} />
            <Route path="despesas" element={<Despesas />} />
            <Route path="documentos" element={<Documentos />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<DashboardHome />} />
          </Routes>
        </div>
      </main>
    </div>
  )
} 