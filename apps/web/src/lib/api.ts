export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api';
export function token(){return typeof window==='undefined'?'':localStorage.getItem('sige_access')||''}

export type ApiOptions = RequestInit & {
  /** Mensaje de confirmación global. Use false para omitir el aviso automático. */
  successMessage?: string | false;
};

export function notify(message:string,tone:'success'|'error'|'info'='success',duration=1900){
  if(typeof window==='undefined'||!message)return;
  window.dispatchEvent(new CustomEvent('sige:toast',{detail:{message,tone,duration}}));
}

function defaultSuccessMessage(path:string,method:string){
  if(method==='DELETE')return 'Eliminado correctamente.';
  if(path.includes('/active')||path.includes('/status')||path.includes('/lapses/'))return method==='PATCH'?'Cambio guardado correctamente.':'Guardado correctamente.';
  if(path.includes('/teacher'))return 'Cambio de docente guardado correctamente.';
  if(path.includes('/objective'))return 'Objetivo guardado correctamente.';
  if(method==='PATCH'||method==='PUT')return 'Cambios guardados correctamente.';
  return 'Guardado correctamente.';
}

export async function api<T=any>(path:string,options:ApiOptions={}):Promise<T>{
  const {successMessage,...requestOptions}=options;
  const h=new Headers(requestOptions.headers);
  h.set('Content-Type','application/json');
  const t=token();
  if(t)h.set('Authorization',`Bearer ${t}`);
  let r=await fetch(`${API}${path}`,{...requestOptions,cache:requestOptions.cache??'no-store',headers:h,credentials:'include'});
  if(r.status===401&&typeof window!=='undefined'){
    const rr=await fetch(`${API}/auth/refresh`,{method:'POST',credentials:'include'});
    if(rr.ok){
      const j=await rr.json();
      localStorage.setItem('sige_access',j.accessToken);
      h.set('Authorization',`Bearer ${j.accessToken}`);
      r=await fetch(`${API}${path}`,{...requestOptions,cache:requestOptions.cache??'no-store',headers:h,credentials:'include'});
    }
  }
  if(!r.ok){
    const payload=await r.json().catch(()=>({message:r.statusText}));
    const message=Array.isArray(payload?.message)?payload.message.join(' · '):(payload?.message||'Error API');
    throw new Error(message);
  }
  const method=String(requestOptions.method||'GET').toUpperCase();
  if(method!=='GET'&&!path.startsWith('/auth/')&&successMessage!==false){
    notify(typeof successMessage==='string'?successMessage:defaultSuccessMessage(path,method),'success');
  }
  if(r.status===204)return undefined as T;
  return r.json();
}
