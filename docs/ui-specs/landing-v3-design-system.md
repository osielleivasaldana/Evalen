🎨 Evalen UI Kit & Design System (v3.0 - Aurora Glassmorphism)

Versión: 3.0.0
Estilo Base: Neo-Glassmorphism / Aurora UI
Librería CSS: Tailwind CSS v3.4+
Iconografía: Lucide React (lucide-react)

1. Fundamentos (Tokens de Diseño)

1.1 Tipografía

Se requiere una tipografía geométrica de estilo suizo que soporte pesos extremos para mantener la estética
"brutalista-elegante".

Familia Principal: Geist, Inter o Roobert.

Pesos Utilizados: * Texto Base: font-medium (500)

Destacados: font-bold (700)

Títulos Hero/H1/H2: font-black (900)

Tracking (Espaciado): Títulos grandes utilizan tracking-tighter (-0.05em) para un look más compacto y moderno.

1.2 Paleta de Colores (Tailwind Base)

El sistema utiliza un manejo dinámico de temas (Día/Noche) mediante objetos de estado.

Fondos Principales (Base de la página):

Dark Mode: #030014 (Azul noche súper profundo, casi negro).

Light Mode: #fdfdfd (Blanco perla absoluto).

Gradients Aurora (Los "Orbes" de luz):

Color 1: rose-500 (#f43f5e) a rose-400

Color 2: cyan-500 (#06b6d4)

Color 3: violet-600 (#7c3aed) a fuchsia-500 (#d946ef)

Color 4 (Exclusivo Light Mode): amber-300 (#fcd34d) para calidez.

Escala de Texto:

Dark Mode: text-slate-50 (Principal), text-slate-400 (Secundario/Muted).

Light Mode: text-slate-900 (Principal), text-slate-500 (Secundario/Muted).

2. Clases CSS Personalizadas (globals.css)

Para lograr los efectos de desenfoque e iluminación, debes inyectar estas reglas en tu archivo global CSS o en la
configuración de Tailwind:

/* Animación de los orbes de fondo */
@keyframes blob {
0% { transform: translate(0px, 0px) scale(1); }
33% { transform: translate(40px, -60px) scale(1.2); }
66% { transform: translate(-30px, 30px) scale(0.8); }
100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob {
animation: blob 10s infinite alternate;
}
.animation-delay-2000 { animation-delay: 2s; }
.animation-delay-4000 { animation-delay: 4s; }

/* El efecto Cristal (Glassmorphism 2.0) */
.glass-effect {
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
}

/* Títulos con brillo en movimiento */
.text-gradient-vibrant {
background: linear-gradient(to right, #f43f5e, #8b5cf6, #06b6d4);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-size: 200% auto;
animation: shine 5s linear infinite;
}

@keyframes shine {
to { background-position: 200% center; }
}


3. Componentes Core (UI Kit)

3.1 Botones (Buttons)

Primary CTA (The "WOW" Button)
Uso: Hero section, Planes de Pricing recomendados.

<button
    className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600 text-white px-8 py-4 rounded-full text-lg font-bold transition-transform hover:scale-105 hover:shadow-[0_0_40px_rgba(244,63,94,0.4)] flex items-center gap-2">
    Empezar gratis
</button>


Secondary CTA (Glass Button)
Uso: Acciones secundarias, "Ver demo". Requiere inyectar las clases del tema actual (isDark).

<button className={`glass-effect px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 flex
    items-center gap-2 ${isDark ? 'bg-slate-900/40 border-white/10 text-slate-50'
    : 'bg-white/60 border-slate-200/80 text-slate-900' } `}>
    Ver Demo
</button>


3.2 Badges / Etiquetas

Neon Badge (Hero & Secciones)
Uso: Para denotar innovación, nuevas versiones o categorías.

<div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase
    tracking-widest backdrop-blur-md ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    : 'border-rose-500/20 bg-white shadow-sm text-rose-600' } `}>
    <Zap className="w-4 h-4 fill-current" /> Plataforma 3.0
</div>


3.3 Tarjetas (Glass Cards / Bento Grid)

Estas tarjetas forman la estructura base de los Bento Grids y las tablas de precios. Tienen bordes sutiles que cambian
en hover.

<div className={`glass-effect p-8 rounded-3xl transition-all duration-500 group relative overflow-hidden ${isDark
    ? 'bg-slate-900/40 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-fuchsia-500/50'
    : 'bg-white/60 border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-rose-400/50' } `}>
    {/* Contenido aquí */}
</div>


3.4 El Fondo Activo (Aurora Background)

Este es el patrón estructural para inyectar los orbes de luz detrás del contenido. Debe estar configurado como
pointer-events-none y absolute en un contenedor con overflow-hidden.

<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full opacity-40 pointer-events-none">
    <div className={`absolute top-10 left-10 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter
        blur-[120px] animate-blob transition-colors duration-1000 ${isDark ? 'bg-fuchsia-600' : 'bg-rose-400' } `}>
    </div>
    <div className={`absolute top-20 right-10 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-screen filter
        blur-[120px] animate-blob animation-delay-2000 transition-colors duration-1000 ${isDark ? 'bg-cyan-500'
        : 'bg-blue-400' } `}></div>
</div>