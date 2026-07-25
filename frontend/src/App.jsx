function App() {

  return (



    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">


      <div class="bg-indigo-600 px-8 py-6 text-center">
        <h1 class="text-2xl font-bold text-white tracking-wide">EduNotas</h1>
        <p class="text-indigo-100 text-sm mt-1">Ingresa a tu panel de calificaciones</p>
      </div>


      <form class="p-8 space-y-5" action="#" method="POST">


        <div>
          <label for="email" class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="profe@escuela.com"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-700 text-sm"
          />
        </div>


        <div>
          <div class="flex justify-between items-center mb-2">
            <label for="password" class="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Contraseña
            </label>
            <a href="#" class="text-xs text-indigo-600 hover:underline font-medium">¿Olvidaste tu contraseña?</a>
          </div>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-700 text-sm"
          />
        </div>


        <div class="flex items-center">
          <input
            type="checkbox"
            id="remember"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
          />
          <label for="remember" class="ml-2 text-sm text-gray-600 cursor-pointer">Recordarme en este dispositivo</label>
        </div>


        <button
          type="submit"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Iniciar Sesión
        </button>

      </form>


      <div class="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
        <p class="text-sm text-gray-600">
          ¿Aún no tienes una cuenta?
          <a href="#" class="text-indigo-600 font-semibold hover:underline">Registrarme gratis</a>
        </p>
      </div>

    </div>


  )
}

export default App
