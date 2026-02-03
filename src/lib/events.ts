// Simple event system for points updates
type PointsListener = (points: number) => void;

const pointsListeners: Set<PointsListener> = new Set();

export const pointsEvents = {
    subscribe(listener: PointsListener) {
        pointsListeners.add(listener);
        return () => pointsListeners.delete(listener);
    },

    emit(points: number) {
        pointsListeners.forEach(listener => listener(points));
    }
};

// Event system for message read updates (to refresh unread count in Navbar)
type MessageListener = () => void;

const messageListeners: Set<MessageListener> = new Set();

export const messageEvents = {
    subscribe(listener: MessageListener) {
        messageListeners.add(listener);
        return () => messageListeners.delete(listener);
    },

    emitRead() {
        messageListeners.forEach(listener => listener());
    }
};
