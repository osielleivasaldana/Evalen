import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Skeleton } from "../ui/skeleton"
import { Spinner } from "../ui/spinner"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { StatCard } from "../ui/stat-card"
import { GlassCard } from "../ui/glass-card"
import { AuroraBackground } from "../ui/aurora-background"
import { GradientHeader } from "../ui/gradient-header"
import { ScoreCircle } from "../ui/score-circle"
import { BriefcaseIcon, ArrowTrendingUpIcon, UserGroupIcon, UserPlusIcon, SparklesIcon, EyeIcon } from "@heroicons/react/24/outline"

export default function UIDemo() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 space-y-12 font-jakarta">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">🎨 Evalen UI Kit — Visual Review</h1>
        <p className="text-muted-foreground mt-2">Showcase completo de componentes, design tokens y estilos de la plataforma</p>
        <p className="text-sm text-muted-foreground mt-1">Ruta: <code className="bg-muted px-1 py-0.5 rounded text-xs">/ui-demo</code></p>
      </div>

      {/* SECCIÓN 1: TIPOGRAFÍA */}
      <Section title="Tipografía">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Heading 1 — 36px Bold</h1>
          <h2 className="text-3xl font-bold text-foreground">Heading 2 — 30px Bold</h2>
          <h3 className="text-2xl font-semibold text-foreground">Heading 3 — 24px Semibold</h3>
          <h4 className="text-xl font-semibold text-foreground">Heading 4 — 20px Semibold</h4>
          <p className="text-base text-foreground">Párrafo base — 16px — Texto principal del cuerpo. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p className="text-sm text-muted-foreground">Texto secundario/muted — 14px — Descripciones y metadata.</p>
          <p className="text-xs text-muted-foreground">Texto pequeño — 12px — Labels y badges.</p>
        </div>
      </Section>

      {/* SECCIÓN 2: BOTONES */}
      <Section title="Botones">
        <div className="space-y-6">
          {/* Variantes */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Variantes</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          {/* Tamaños */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Tamaños</h3>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🔧</Button>
            </div>
          </div>

          {/* Estados */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Estados</h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="default" disabled>Disabled</Button>
              <Button variant="default" className="ring-2 ring-ring ring-offset-2">Focus (simulado)</Button>
              <Button variant="default" className="bg-primary/90">Hover (simulado)</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 3: BADGES */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      {/* SECCIÓN 4: INPUTS Y FORMULARIOS */}
      <Section title="Inputs y Formularios">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <Label htmlFor="demo-email">Correo Electrónico</Label>
            <Input id="demo-email" type="email" placeholder="nombre@empresa.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-error">Campo con Error</Label>
            <Input id="demo-error" type="text" placeholder="Escribe algo..." error="Este campo es obligatorio" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-disabled">Campo Deshabilitado</Label>
            <Input id="demo-disabled" type="text" placeholder="No se puede editar" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-textarea">Textarea</Label>
            <textarea
              id="demo-textarea"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Escribe un mensaje..."
            />
          </div>
        </div>
      </Section>

      {/* SECCIÓN 5: CARDS */}
      <Section title="Cards y Contenedores">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Básica</CardTitle>
              <CardDescription>Descripción de la tarjeta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">Contenido principal de la tarjeta con shadow-sm y bordes redondeados.</p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="outline">Cancelar</Button>
              <Button variant="default">Aceptar</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métrica</CardTitle>
              <CardDescription>Candidatos activos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">142</p>
              <p className="text-sm text-success mt-1">↑ 12% vs mes anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* SECCIÓN 6: ESTADOS DE CARGA */}
      <Section title="Estados de Carga">
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Spinners</h3>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs text-muted-foreground">SM</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs text-muted-foreground">MD</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs text-muted-foreground">LG</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Skeletons</h3>
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 p-8 border rounded-lg bg-muted/50">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground animate-pulse">Analizando habilidades...</p>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 7: STAT CARDS (Dashboard) */}
      <Section title="Stat Cards (Dashboard)">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            gradient="stat-1"
            icon={<BriefcaseIcon className="w-7 h-7" />}
            value={24}
            label="Total Campañas"
          />
          <StatCard
            gradient="stat-2"
            icon={<ArrowTrendingUpIcon className="w-7 h-7" />}
            value={12}
            label="Campañas Activas"
          />
          <StatCard
            gradient="stat-3"
            icon={<UserGroupIcon className="w-7 h-7" />}
            value={342}
            label="Total Candidatos"
          />
          <StatCard
            gradient="stat-4"
            icon={<UserPlusIcon className="w-7 h-7" />}
            value={18}
            label="Nuevos esta semana"
          />
        </div>
      </Section>

      {/* SECCIÓN 8: GLASS CARDS */}
      <Section title="Glass Cards (Glassmorphism)">
        <div className="p-8 bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard variant="candidate" className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <ScoreCircle score={92} size="sm" />
                <div>
                  <h4 className="font-bold text-slate-800">María García</h4>
                  <p className="text-xs text-slate-500">Full Stack Developer</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                Perfil altamente compatible con las expectativas del puesto.
              </p>
              <Button size="sm" className="w-full mt-3">
                <EyeIcon className="w-4 h-4" />
                Ver Perfil
              </Button>
            </GlassCard>

            <GlassCard variant="candidate" className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <ScoreCircle score={78} size="sm" />
                <div>
                  <h4 className="font-bold text-slate-800">Juan Pérez</h4>
                  <p className="text-xs text-slate-500">Tech Lead</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                Candidato con coincidencia parcial, se recomienda revisión.
              </p>
              <Button size="sm" className="w-full mt-3">
                <EyeIcon className="w-4 h-4" />
                Ver Perfil
              </Button>
            </GlassCard>

            <GlassCard variant="candidate" className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <ScoreCircle score={45} size="sm" />
                <div>
                  <h4 className="font-bold text-slate-800">Ana López</h4>
                  <p className="text-xs text-slate-500">Junior Developer</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                Presenta una compatibilidad baja con los requisitos del puesto.
              </p>
              <Button size="sm" className="w-full mt-3">
                <EyeIcon className="w-4 h-4" />
                Ver Perfil
              </Button>
            </GlassCard>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 9: AURORA BACKGROUND */}
      <Section title="Aurora Background">
        <AuroraBackground variant="talent">
          <div className="p-8 border-b border-indigo-50 relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-indigo-600 animate-pulse-slow" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                TALENTOS DESTACADOS
              </span>
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              El escenario donde brillan tus mejores candidatos.
            </p>
          </div>
          <div className="p-8 relative z-10">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[92, 85, 78, 72, 65].map((score, i) => (
                <GlassCard key={i} variant="candidate" className="w-[200px] flex-shrink-0 p-4 text-center">
                  <ScoreCircle score={score} size="md" className="mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">Candidato {i + 1}</h4>
                  <p className="text-xs text-slate-500 mt-1">Match: {score}%</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </AuroraBackground>
      </Section>

      {/* SECCIÓN 10: GRADIENT HEADERS */}
      <Section title="Gradient Headers">
        <div className="space-y-6 max-w-2xl">
          <Card className="overflow-hidden">
            <GradientHeader variant="brand">
              <div>
                <h3 className="text-xl font-bold">Mis Campañas</h3>
                <p className="text-sm opacity-90">5 campañas · Gestiona tu reclutamiento</p>
              </div>
              <Button size="sm" className="bg-white text-indigo-600 hover:bg-gray-100">Nueva</Button>
            </GradientHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Contenido de la sección de campañas...</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <GradientHeader variant="warning">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">⚠️</div>
                <div>
                  <h3 className="text-xl font-bold">Pausar Campaña</h3>
                  <p className="text-sm text-yellow-100">Confirma esta acción</p>
                </div>
              </div>
            </GradientHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Contenido del modal de advertencia...</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* SECCIÓN 11: SCORE CIRCLES */}
      <Section title="Score Circles">
        <div className="flex flex-wrap gap-8 items-center">
          <div className="flex flex-col items-center gap-2">
            <ScoreCircle score={92} size="sm" />
            <span className="text-xs text-muted-foreground">SM — 92%</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreCircle score={78} size="md" />
            <span className="text-xs text-muted-foreground">MD — 78%</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreCircle score={45} size="lg" />
            <span className="text-xs text-muted-foreground">LG — 45%</span>
          </div>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Colores por score:</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs">≥ 80%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs">60-79%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs">&lt; 60%</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 12: PALETA DE COLORES */}
      <Section title="Paleta de Colores">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <ColorSwatch name="Background" className="bg-background border border-border" />
          <ColorSwatch name="Foreground" className="bg-foreground" />
          <ColorSwatch name="Primary" className="bg-primary" />
          <ColorSwatch name="Primary FG" className="bg-primary-foreground border border-border" />
          <ColorSwatch name="Secondary" className="bg-secondary" />
          <ColorSwatch name="Secondary FG" className="bg-secondary-foreground" />
          <ColorSwatch name="Muted" className="bg-muted" />
          <ColorSwatch name="Muted FG" className="bg-muted-foreground" />
          <ColorSwatch name="Accent" className="bg-accent" />
          <ColorSwatch name="Accent FG" className="bg-accent-foreground" />
          <ColorSwatch name="Destructive" className="bg-destructive" />
          <ColorSwatch name="Destructive FG" className="bg-destructive-foreground" />
          <ColorSwatch name="Success" className="bg-success" />
          <ColorSwatch name="Success FG" className="bg-success-foreground" />
          <ColorSwatch name="Warning" className="bg-warning" />
          <ColorSwatch name="Warning FG" className="bg-warning-foreground" />
          <ColorSwatch name="Border" className="bg-border" />
          <ColorSwatch name="Input" className="bg-input" />
          <ColorSwatch name="Ring" className="bg-ring" />
          <ColorSwatch name="Card" className="bg-card border border-border" />
        </div>
      </Section>

      {/* SECCIÓN 13: GRADIENTES */}
      <Section title="Gradientes (Design Tokens)">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <GradientSwatch name="gradient-brand" className="bg-gradient-brand" />
          <GradientSwatch name="gradient-stat-1" className="bg-gradient-stat-1" />
          <GradientSwatch name="gradient-stat-2" className="bg-gradient-stat-2" />
          <GradientSwatch name="gradient-stat-3" className="bg-gradient-stat-3" />
          <GradientSwatch name="gradient-stat-4" className="bg-gradient-stat-4" />
          <GradientSwatch name="gradient-header" className="bg-gradient-header" />
          <GradientSwatch name="gradient-modal-warning" className="bg-gradient-modal-warning" />
          <GradientSwatch name="gradient-talent-bg" className="bg-gradient-talent-bg border border-border" />
          <GradientSwatch name="gradient-logo" className="bg-gradient-logo" />
        </div>
      </Section>

      {/* SECCIÓN 14: GEOMETRÍA — BORDER RADIUS */}
      <Section title="Geometría — Border Radius">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-sm" />
            <span className="text-xs text-muted-foreground">rounded-sm</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-md" />
            <span className="text-xs text-muted-foreground">rounded-md</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-lg" />
            <span className="text-xs text-muted-foreground">rounded-lg</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-xl" />
            <span className="text-xs text-muted-foreground">rounded-xl</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-primary rounded-full" />
            <span className="text-xs text-muted-foreground">rounded-full</span>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 15: SOMBRAS */}
      <Section title="Geometría — Sombras">
        <div className="space-y-8">
          {/* Sombras Tailwind default */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Tailwind Default</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-sm" />
                <span className="text-xs text-muted-foreground">shadow-sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow" />
                <span className="text-xs text-muted-foreground">shadow</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-md" />
                <span className="text-xs text-muted-foreground">shadow-md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-lg" />
                <span className="text-xs text-muted-foreground">shadow-lg</span>
              </div>
            </div>
          </div>

          {/* Sombras custom */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Custom (Evalen)</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-stat" />
                <span className="text-xs text-muted-foreground">shadow-stat</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-talent" />
                <span className="text-xs text-muted-foreground">shadow-talent</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-card rounded-lg shadow-modal" />
                <span className="text-xs text-muted-foreground">shadow-modal</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-primary rounded-lg shadow-glow-indigo" />
                <span className="text-xs text-muted-foreground">shadow-glow-indigo</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* SECCIÓN 16: ANIMACIONES */}
      <Section title="Animaciones">
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-lg animate-slide-up" />
            <span className="text-xs text-muted-foreground">slide-up</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-lg animate-pulse" />
            <span className="text-xs text-muted-foreground">pulse</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-full animate-bounce" />
            <span className="text-xs text-muted-foreground">bounce</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-full animate-ping" />
            <span className="text-xs text-muted-foreground">ping</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-lg animate-float" />
            <span className="text-xs text-muted-foreground">float</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-lg animate-fade-in-up" />
            <span className="text-xs text-muted-foreground">fade-in-up</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-destructive rounded-lg animate-shake" />
            <span className="text-xs text-muted-foreground">shake</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-primary rounded-lg animate-pulse-slow" />
            <span className="text-xs text-muted-foreground">pulse-slow</span>
          </div>
        </div>
      </Section>
    </div>
  )
}

// Componente helper para secciones
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  )
}

// Componente helper para swatches de color
function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 rounded-md ${className}`} />
      <span className="text-xs text-muted-foreground text-center">{name}</span>
    </div>
  )
}

// Componente helper para swatches de gradiente
function GradientSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-full h-16 rounded-md ${className}`} />
      <span className="text-xs text-muted-foreground font-mono">{name}</span>
    </div>
  )
}
