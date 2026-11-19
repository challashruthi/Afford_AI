import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * WebSocket connection states:
 *  'connected'    → ● Live updates connected
 *  'reconnecting' → ○ Reconnecting...
 *  'unavailable'  → ⚠ Realtime unavailable
 *  'disconnected' → manually disconnected by user
 */

export class RideWebSocketClient {
  constructor(onMessageCallback, onStatusChangeCallback) {
    this.onMessageCallback = onMessageCallback;
    this.onStatusChangeCallback = onStatusChangeCallback;
    this.stompClient = null;
    this.connected = false;
    this._manualDisconnect = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 5;
    this._searchSubscription = null;
    this._currentSearchId = null;
  }

  connect() {
    this._manualDisconnect = false;

    try {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws-ride-updates`),
        reconnectDelay: 5000,
        debug: () => {}, // suppress debug noise

        onConnect: () => {
          this.connected = true;
          this._reconnectAttempts = 0;
          if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback('connected');
          }

          // Subscribe to the global surge/demand topic
          this.stompClient.subscribe('/topic/ride-updates', (message) => {
            if (message.body) {
              try {
                const payload = JSON.parse(message.body);
                // Only propagate SURGE_STATE_UPDATE — not fare updates (those come per-searchId)
                if (payload.updateType === 'SURGE_STATE_UPDATE' && this.onMessageCallback) {
                  this.onMessageCallback(payload);
                }
              } catch (e) {
                // Malformed JSON — ignore
              }
            }
          });

          // Re-subscribe to the current search topic if we had one
          if (this._currentSearchId != null) {
            this._subscribeToSearch(this._currentSearchId);
          }
        },

        onDisconnect: () => {
          this.connected = false;
          if (!this._manualDisconnect) {
            this._reconnectAttempts++;
            if (this._reconnectAttempts >= this._maxReconnectAttempts) {
              if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback('unavailable');
              }
            } else {
              if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback('reconnecting');
              }
            }
          } else {
            if (this.onStatusChangeCallback) {
              this.onStatusChangeCallback('disconnected');
            }
          }
        },

        onStompError: (frame) => {
          this.connected = false;
          this._reconnectAttempts++;
          if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            if (this.onStatusChangeCallback) {
              this.onStatusChangeCallback('unavailable');
            }
          } else {
            if (this.onStatusChangeCallback) {
              this.onStatusChangeCallback('reconnecting');
            }
          }
        },

        onWebSocketError: () => {
          this.connected = false;
          if (!this._manualDisconnect) {
            if (this.onStatusChangeCallback) {
              this.onStatusChangeCallback('unavailable');
            }
          }
        },
      });

      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('reconnecting');
      }
      this.stompClient.activate();
    } catch (e) {
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('unavailable');
      }
    }
  }

  /**
   * Subscribe to fare updates for a specific searchId.
   * Unsubscribes from the previous searchId subscription first.
   * Call this after receiving a searchId from the POST /api/rides/search response.
   */
  subscribeToSearchId(searchId) {
    if (searchId == null) return;
    this._currentSearchId = searchId;

    if (this.connected && this.stompClient) {
      this._subscribeToSearch(searchId);
    }
    // If not yet connected, the onConnect handler will subscribe when ready
  }

  _subscribeToSearch(searchId) {
    // Unsubscribe previous
    if (this._searchSubscription) {
      try { this._searchSubscription.unsubscribe(); } catch (_) {}
      this._searchSubscription = null;
    }

    const topic = `/topic/ride-updates/${searchId}`;
    this._searchSubscription = this.stompClient.subscribe(topic, (message) => {
      if (message.body) {
        try {
          const payload = JSON.parse(message.body);
          if (payload.updateType === 'FARE_UPDATE' && this.onMessageCallback) {
            this.onMessageCallback(payload);
          }
        } catch (e) {
          // Malformed JSON — ignore
        }
      }
    });
  }

  disconnect() {
    this._manualDisconnect = true;
    if (this._searchSubscription) {
      try { this._searchSubscription.unsubscribe(); } catch (_) {}
      this._searchSubscription = null;
    }
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connected = false;
      if (this.onStatusChangeCallback) {
        this.onStatusChangeCallback('disconnected');
      }
    }
  }

  isConnected() {
    return this.connected;
  }
}
