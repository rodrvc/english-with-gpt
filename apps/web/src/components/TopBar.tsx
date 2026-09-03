import { NavLink } from 'react-router-dom';

const MODULES = [
  { path: '/speaking', name: 'Speaking', sub: 'Habla', available: false },
  { path: '/listening', name: 'Listening', sub: 'Escucha', available: false },
  { path: '/writing', name: 'Writing', sub: 'Escritura', available: true },
  { path: '/reading', name: 'Reading', sub: 'Lectura', available: false },
];

export function TopBar({ level }: { level?: string }) {
  return (
    <header className="topbar">
      <NavLink to="/writing" className="logo">
        <span className="dot">✎</span> English Practice
      </NavLink>
      <nav className="tabs" aria-label="Módulos de práctica">
        {MODULES.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={m.available ? 'tab' : 'tab soon'}
            title={m.available ? m.name : `${m.name} · próximamente`}
          >
            {m.name}
            <span className="sub">{m.available ? m.sub : 'Próximamente'}</span>
          </NavLink>
        ))}
      </nav>
      <div className="spacer" />
      {level && <div className="pill">✍️ Nivel {level}</div>}
    </header>
  );
}
