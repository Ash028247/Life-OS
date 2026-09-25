import {
  ContextSnapshot,
  Period,
  DeviceType,
  Connectivity,
  EnergyLevel,
} from '@life-os/types';

/**
 * Context Engine
 * 
 * Produces a ContextSnapshot based on:
 * - Explicit user input (time available, energy level, intention)
 * - Implicit context (current time, recent activity, device info)
 */

export interface ContextEngineInput {
  now?: Date;
  availableMinutes?: number;
  energy?: EnergyLevel;
  device?: DeviceType;
  connectivity?: Connectivity;
  activeProjectId?: string;
  recentProjectIds?: string[];
  userIntention?: string;
}

export class ContextEngine {
  private static readonly MORNING_START = 6;
  private static readonly AFTERNOON_START = 12;
  private static readonly EVENING_START = 18;
  private static readonly NIGHT_START = 22;

  /**
   * Get the current period based on the hour
   */
  private getPeriod(hour: number): Period {
    if (hour >= this.constructor.MORNING_START && hour < this.constructor.AFTERNOON_START) {
      return 'morning';
    } else if (hour >= this.constructor.AFTERNOON_START && hour < this.constructor.EVENING_START) {
      return 'afternoon';
    } else if (hour >= this.constructor.EVENING_START && hour < this.constructor.NIGHT_START) {
      return 'evening';
    }
    return 'night';
  }

  /**
   * Get device type from user agent or platform
   */
  private getDeviceType(userAgent?: string, platform?: string): DeviceType {
    if (platform === 'ios' || platform === 'android') {
      return 'mobile';
    }
    if (userAgent) {
      const lowerAgent = userAgent.toLowerCase();
      if (lowerAgent.includes('mobile') || lowerAgent.includes('android') || lowerAgent.includes('iphone')) {
        return 'mobile';
      } else if (lowerAgent.includes('tablet') || lowerAgent.includes('ipad')) {
        return 'tablet';
      } else if (lowerAgent.includes('macintosh') || lowerAgent.includes('windows') || lowerAgent.includes('linux')) {
        return 'desktop';
      }
    }
    return 'unknown';
  }

  /**
   * Create a context snapshot from input
   */
  createSnapshot(input: ContextEngineInput = {}): ContextSnapshot {
    const now = input.now || new Date();
    const hour = now.getHours();

    return {
      now: now.toISOString(),
      availableMinutes: input.availableMinutes,
      energy: input.energy,
      period: this.getPeriod(hour),
      device: input.device || this.getDeviceType(undefined, undefined),
      connectivity: input.connectivity || 'online',
      activeProjectId: input.activeProjectId,
      recentProjectIds: input.recentProjectIds || [],
      userIntention: input.userIntention,
    };
  }

  /**
   * Update context with new information
   */
  updateSnapshot(snapshot: ContextSnapshot, updates: Partial<ContextSnapshot>): ContextSnapshot {
    return {
      ...snapshot,
      ...updates,
    };
  }

  /**
   * Check if context has enough information for good recommendations
   */
  hasSufficientContext(snapshot: ContextSnapshot): boolean {
    // At minimum, we need a time reference
    if (!snapshot.now) return false;
    
    // For better recommendations, we'd like some of these
    const hasTimeInfo = snapshot.availableMinutes !== undefined;
    const hasEnergyInfo = snapshot.energy !== undefined;
    const hasProjectInfo = snapshot.activeProjectId !== undefined || snapshot.recentProjectIds.length > 0;
    
    // Good context has at least 2 of these
    const goodContextCount = [hasTimeInfo, hasEnergyInfo, hasProjectInfo].filter(Boolean).length;
    
    return goodContextCount >= 1; // At least one additional piece of info
  }
}

export const contextEngine = new ContextEngine();
