'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { BRANDING } from '@/lib/branding';
import { LayoutDashboard,Users,GraduationCap,ClipboardList,BookOpen,UserRoundCog,ChartNoAxesCombined,Building2,LogOut,SunMoon,Shapes,ContactRound } from 'lucide-react';
import { usePathname,useRouter } from 'next/navigation';

const nav=[
  ['/dashboard','Panel',LayoutDashboard],
  ['/students','Estudiantes',Users],
  ['/representatives','Representantes',ContactRound],
  ['/enrollments','Matrícula',ClipboardList],
  ['/grades','Notas',GraduationCap],
  ['/plans','Planes de estudio',BookOpen],
  ['/groups','Grupos',Shapes],
  ['/staff','Personal',UserRoundCog],
  ['/reports','Reportes',ChartNoAxesCombined],
  ['/institution','Institución',Building2]
] as const;

export default function Shell({children,title}:{children:React.ReactNode,title:string}){
  const router=useRouter();
  const pathname=usePathname();
  const [dark,setDark]=useState(false);

  useEffect(()=>{
    const d=localStorage.getItem('theme')==='dark';
    setDark(d);
    document.documentElement.dataset.theme=d?'dark':'light';
  },[]);

  function theme(){
    const d=!dark;
    setDark(d);
    localStorage.setItem('theme',d?'dark':'light');
    document.documentElement.dataset.theme=d?'dark':'light';
  }

  function logout(){
    localStorage.removeItem('sige_access');
    router.push('/login');
  }

  return <div className="shell">
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="brand">
        <img src={BRANDING.schoolLogo} alt="Escudo ET Isaías Medina Angarita"/>
        <span className="brand-copy"><strong>{BRANDING.systemName}</strong><br/><small>{BRANDING.systemSubtitle}</small></span>
      </div>
      <nav className="nav">
        {nav.map(([href,label,Icon])=>{
          const active=pathname===href || pathname.startsWith(`${href}/`);
          return <Link
            key={href}
            href={href}
            className={active?'active':''}
            aria-current={active?'page':undefined}
            aria-label={label}
            title={label}
            data-label={label}
          >
            <Icon size={19}/>
            <span className="nav-label">{label}</span>
          </Link>
        })}
      </nav>
    </aside>
    <section className="content">
      <header className="topbar">
        <div className="topbar-title"><strong>{title}</strong><div className="muted">{BRANDING.schoolName}</div></div>
        <div className="topbar-actions">
          <button className="btn secondary" onClick={theme} aria-label="Cambiar tema" title="Cambiar tema"><SunMoon size={17}/><span>Tema</span></button>
          <button className="btn secondary icon-btn" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17}/></button>
        </div>
      </header>
      <main className="main">{children}</main>
    </section>
  </div>
}
