import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/providers/AuthProvider";

export function Navbar() {
  const navigate = useNavigate();
  const { logout, isTeacher } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const closeMenus = () => {
      setIsSettingsOpen(false);
      setIsMobileMenuOpen(false);
    };
    window.addEventListener("scroll", closeMenus, { passive: true });
    return () => window.removeEventListener("scroll", closeMenus);
  }, []);

  const handleHeaderBlur = (event) => {
    if (!headerRef.current?.contains(event.relatedTarget)) {
      setIsSettingsOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      ref={headerRef}
      onBlur={handleHeaderBlur}
      className="bg-indigo-600 text-white shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/dashboard" className="text-xl font-bold tracking-wide">
            EduNotas
          </Link>

          <nav className="hidden md:flex space-x-4 text-sm font-medium">
            <Link to="/dashboard" className="hover:text-indigo-200 transition">
              Inicio
            </Link>
            <Link to="/courses" className="hover:text-indigo-200 transition">
              Cursos
            </Link>
            {
              //future features
              /* <Link to="/assignments" className="hover:text-indigo-200 transition">
              Asignaciones
            </Link> */
            }
            <Link to="/grades" className="hover:text-indigo-200 transition">
              Calificaciones
            </Link>
            <Link to="/teams" className="hover:text-indigo-200 transition">
              Equipos
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="text-indigo-200 hover:text-white p-2 rounded-lg transition"
              aria-label="Configuración"
              title="Configuración"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black/5 py-1 z-50">
                <Link
                  to="/settings/profile"
                  onClick={() => setIsSettingsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Editar perfil
                </Link>
                <Link
                  to="/settings/password"
                  onClick={() => setIsSettingsOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Cambiar contraseña
                </Link>
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    logout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-indigo-200 hover:text-white p-2 rounded-lg transition"
            aria-label="Menú"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav className="md:hidden border-t border-indigo-500 px-4 py-3 space-y-2 text-sm font-medium">
          <Link
            to="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-indigo-200 transition"
          >
            Inicio
          </Link>
          <Link
            to="/courses"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-indigo-200 transition"
          >
            Cursos
          </Link>
          <Link
            to="/grades"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-indigo-200 transition"
          >
            Calificaciones
          </Link>
          <Link
            to="/teams"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-indigo-200 transition"
          >
            Equipos
          </Link>
        </nav>
      )}
    </header>
  );
}
