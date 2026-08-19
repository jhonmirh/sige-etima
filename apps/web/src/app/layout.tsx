import './globals.css';
import GlobalToast from '@/components/GlobalToast';

export const metadata={title:'SIGE-ETIMA',description:'Sistema Integral de Gestión Escolar'};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="es"><body>{children}<GlobalToast/></body></html>;
}
