
/**
 * Ejecuta un array de funciones que retornan promesas con un límite de concurrencia.
 * 
 * @param tasks Array de funciones que retornan promesas () => Promise<T>
 * @param concurrency Límite máximo de ejecuciones simultáneas
 * @returns Promesa que resuelve cuando todas las tareas han terminado (éxito o error capturado)
 */
export async function limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
): Promise<void> {
    const queue = [...tasks];
    const activeWorkers: Promise<void>[] = [];

    const worker = async () => {
        while (queue.length > 0) {
            const task = queue.shift();
            if (task) {
                try {
                    await task();
                } catch (error) {
                    console.error("Error in concurrent task:", error);
                }
            }
        }
    };

    for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
        activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);
}
