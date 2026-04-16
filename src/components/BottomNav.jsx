import { NavLink } from 'react-router-dom'

function IconFiles({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={active ? 'text-primary-1' : 'text-neutral-4'}>
      <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconUpload({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={active ? 'text-primary-1' : 'text-neutral-4'}>
      <path d="M12 15V3M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconSearch({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={active ? 'text-primary-1' : 'text-neutral-4'}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconAccount({ active }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={active ? 'text-primary-1' : 'text-neutral-4'}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="9.5" r="2.8" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M6.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-shade-white border-t border-neutral-2 z-50">
      <div className="flex items-end justify-around px-2 pb-2">
        <NavLink to="/" end className="flex flex-col items-center gap-1.5 py-3 px-5">
          {({ isActive }) => (
            <>
              <IconFiles active={isActive} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-1' : 'text-neutral-4'}`}>Files</span>
            </>
          )}
        </NavLink>

        <NavLink to="/upload" className="flex flex-col items-center gap-1.5 py-3 px-5">
          {({ isActive }) => (
            <>
              <IconUpload active={isActive} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-1' : 'text-neutral-4'}`}>Upload</span>
            </>
          )}
        </NavLink>

        <NavLink to="/search" className="flex flex-col items-center gap-1.5 py-3 px-5">
          {({ isActive }) => (
            <>
              <IconSearch active={isActive} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-1' : 'text-neutral-4'}`}>Search</span>
            </>
          )}
        </NavLink>

        <NavLink to="/account" className="flex flex-col items-center gap-1.5 py-3 px-5">
          {({ isActive }) => (
            <>
              <IconAccount active={isActive} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-1' : 'text-neutral-4'}`}>Account</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
