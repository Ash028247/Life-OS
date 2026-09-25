import {
  AIProvider,
  BaseAIProvider,
  ContextSnapshot,
  CandidateTask,
  AIRecommendation,
  AIInterpretation,
} from '@life-os/types';

/**
 * Mock AI Provider
 * 
 * A simple mock implementation for development and testing.
 * Returns deterministic responses based on input.
 */

export class MockAIProvider extends BaseAIProvider implements AIProvider {
  private mockMode: 'simple' | 'random' | 'deterministic' = 'deterministic';

  constructor(mode: 'simple' | 'random' | 'deterministic' = 'deterministic') {
    super();
    this.mockMode = mode;
  }

  isAvailable(): boolean {
    return true;
  }

  getName(): string {
    return 'Mock AI Provider';
  }

  protected async callAI(prompt: string, systemPrompt?: string): Promise<string> {
    // Mock response based on the prompt
    
    // Check for interpretation request
    if (systemPrompt?.includes('capture interpreter')) {
      return this.generateMockInterpretation(prompt);
    }
    
    // Check for arbitration request
    if (systemPrompt?.includes('recommendation arbitrator')) {
      return this.generateMockArbitration(prompt);
    }
    
    // Check for stuck task request
    if (systemPrompt?.includes('task assistant')) {
      return this.generateMockStuckTaskResponse(prompt);
    }
    
    // Check for weekly insights
    if (systemPrompt?.includes('insights generator')) {
      return this.generateMockWeeklyInsights(prompt);
    }
    
    // Default response
    return '{"type": "unknown", "title": "", "confidence": 0}';
  }

  private generateMockInterpretation(prompt: string): string {
    // Extract the user input
    const match = prompt.match(/User input: "([^"]+)"/);
    const input = match ? match[1] : '';
    
    // Simple interpretation logic
    const lowerInput = input.toLowerCase();
    
    // Check for task-like input (starts with verb)
    const taskVerbs = ['do', 'make', 'create', 'build', 'write', 'implement', 'fix', 'design', 'develop', 'test'];
    const startsWithVerb = taskVerbs.some(verb => lowerInput.startsWith(verb));
    
    // Check for project-like input (noun phrase)
    const projectKeywords = ['project', 'system', 'app', 'website', 'feature', 'module', 'component'];
    const hasProjectKeyword = projectKeywords.some(kw => lowerInput.includes(kw));
    
    // Check for goal-like input
    const goalKeywords = ['goal', 'want', 'need', 'achieve', 'accomplish', 'learn', 'become'];
    const hasGoalKeyword = goalKeywords.some(kw => lowerInput.includes(kw));
    
    let type: 'task' | 'project' | 'goal' | 'unknown' = 'task';
    let title = input;
    let confidence = 0.8;
    
    if (hasGoalKeyword && !hasProjectKeyword) {
      type = 'goal';
      // Extract goal title
      title = input.replace(/^(I want to|I need to|My goal is to)/i, '').trim();
      confidence = 0.9;
    } else if (hasProjectKeyword || lowerInput.includes('build') || lowerInput.includes('create')) {
      type = 'project';
      confidence = 0.7;
    } else if (startsWithVerb) {
      type = 'task';
      confidence = 0.9;
    } else {
      type = 'task';
      confidence = 0.6;
    }
    
    return JSON.stringify({
      type,
      title,
      confidence,
    });
  }

  private generateMockArbitration(prompt: string): string {
    // Extract candidates from prompt
    const candidates: { id: string; title: string; estimatedMinutes: number; unblocks: number }[] = [];
    
    // Try to parse candidate information
    const idMatches = prompt.matchAll(/id: "([^"]+)"/g);
    const titleMatches = prompt.matchAll(/title: "([^"]+)"/g);
    const minutesMatches = prompt.matchAll(/estimatedMinutes: (\d+)/g);
    const unblocksMatches = prompt.matchAll(/unblocks: (\d+)/g);
    
    const ids = Array.from(idMatches).map(m => m[1]);
    const titles = Array.from(titleMatches).map(m => m[1]);
    const minutes = Array.from(minutesMatches).map(m => parseInt(m[1]));
    const unblocks = Array.from(unblocksMatches).map(m => parseInt(m[1]));
    
    for (let i = 0; i < Math.min(ids.length, titles.length); i++) {
      candidates.push({
        id: ids[i],
        title: titles[i],
        estimatedMinutes: minutes[i] || 30,
        unblocks: unblocks[i] || 0,
      });
    }
    
    // Simple selection logic
    if (candidates.length === 0) {
      return JSON.stringify({
        selectedTaskId: '',
        confidence: 0,
        reason: 'No candidates available',
      });
    }
    
    // Select the first candidate that unblocks others, or the first one
    let selectedIndex = 0;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].unblocks > 0) {
        selectedIndex = i;
        break;
      }
    }
    
    const selected = candidates[selectedIndex];
    
    return JSON.stringify({
      selectedTaskId: selected.id,
      confidence: 0.85,
      reason: `Selected "${selected.title}" because it ${selected.unblocks > 0 ? `unblocks ${selected.unblocks} other tasks` : 'is the highest priority'}`,
      alternativeTaskId: candidates.length > 1 ? candidates[1].id : undefined,
    });
  }

  private generateMockStuckTaskResponse(prompt: string): string {
    return JSON.stringify({
      suggestions: [
        'Break this task down into smaller, more manageable steps',
        'Identify what specifically is blocking you',
        'Consider if you need more information or resources',
      ],
      nextSteps: [
        'Write down what you know',
        'Identify what you need to find out',
        'Create a smaller first step',
      ],
      clarificationQuestions: [
        'What part of this task feels most difficult?',
        'Do you have all the information you need?',
        'Is there someone who could help?',
      ],
    });
  }

  private generateMockWeeklyInsights(prompt: string): string {
    // Extract data from prompt
    const tasksMatch = prompt.match(/Tasks completed: (\d+)/);
    const projectsMatch = prompt.match(/Projects advanced: (\d+)/);
    const ideasMatch = prompt.match(/Ideas captured: (\d+)/);
    const focusMatch = prompt.match(/Focus time \(minutes\): (\d+)/);
    
    const tasks = tasksMatch ? parseInt(tasksMatch[1]) : 0;
    const projects = projectsMatch ? parseInt(projectsMatch[1]) : 0;
    const ideas = ideasMatch ? parseInt(ideasMatch[1]) : 0;
    const focus = focusMatch ? parseInt(focusMatch[1]) : 0;
    
    const insights: string[] = [];
    
    if (tasks > 10) {
      insights.push(`You completed ${tasks} tasks this week, showing strong productivity.`);
    } else if (tasks > 0) {
      insights.push(`You completed ${tasks} tasks this week.`);
    }
    
    if (projects > 0) {
      insights.push(`You made progress on ${projects} project${projects > 1 ? 's' : ''} this week.`);
    }
    
    if (ideas > 5) {
      insights.push(`You captured ${ideas} ideas this week, showing active thinking.`);
    }
    
    if (focus > 60) {
      insights.push(`You spent ${focus} minutes in focused work this week.`);
    }
    
    return JSON.stringify(insights);
  }
}

export const mockAIProvider = new MockAIProvider();
