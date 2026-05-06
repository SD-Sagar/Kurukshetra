import { Events } from 'phaser';

// Global Event Bus for Phaser <-> React communication
export const EventBus = new Events.EventEmitter();
