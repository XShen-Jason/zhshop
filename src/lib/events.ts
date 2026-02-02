// Simple event system for points updates
type Listener = (points: number) => void;

const listeners: Set<Listener> = new Set();

export const pointsEvents = {
    subscribe(listener: Listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    emit(points: number) {
        listeners.forEach(listener => listener(points));
    }
};
