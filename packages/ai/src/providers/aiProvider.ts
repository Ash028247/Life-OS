import {
  ContextSnapshot,
  CandidateTask,
  AIRecommendation,
  AIInterpretation,
} from '@life-os/types';

/**
 * AI Provider Interface
 * 
 * Abstracts away the specific AI provider (Claude, Gemini, Mistral, etc.)
 * The rest of the application should only use this interface.
 */

export interface AIProvider {
  /**
   * Interpret user capture input (text, voice, etc.)
   */
  interpretCapture(input: string, context?: ContextSnapshot): Promise<AIInterpretation>;

  /**
   * Arbitrate between candidate tasks to select the best recommendation
   */
  arbitrateRecommendation(
    context: ContextSnapshot,
    candidates: CandidateTask[]
  ): Promise<AIRecommendation>;

  /**
   * Help user when they're stuck on a task
   */
  helpWithStuckTask(
    task: { id: string; title: string; description?: string },
    context: ContextSnapshot,
    issue?: string
  ): Promise<{
    suggestions: string[];
    nextSteps?: string[];
    clarificationQuestions?: string[];
  }>;

  /**
   * Generate weekly review insights
   */
  generateWeeklyInsights(
    completedTasks: number,
    projectsAdvanced: number,
    ideasCaptured: number,
    focusTime: number
  ): Promise<string[]>;

  /**
   * Check if the provider is available
   */
  isAvailable(): boolean;

  /**
   * Get provider name
   */
  getName(): string;
}

/**
 * Base AI Provider with common functionality
 */

export abstract class BaseAIProvider implements AIProvider {
  protected abstract callAI(prompt: string, systemPrompt?: string): Promise<string>;

  abstract isAvailable(): boolean;
  abstract getName(): string;

  /**
   * Interpret user capture
   */
  async interpretCapture(input: string, context?: ContextSnapshot): Promise<AIInterpretation> {
    const systemPrompt = this.buildInterpretationPrompt(context);
    const userPrompt = this.buildInterpretationUserPrompt(input);
    
    try {
      const response = await this.callAI(userPrompt, systemPrompt);
      return this.parseInterpretation(response);
    } catch (error) {
      console.error('AI interpretation failed:', error);
      return {
        type: 'unknown',
        title: input,
        confidence: 0.0,
      };
    }
  }

  /**
   * Arbitrate recommendation
   */
  async arbitrateRecommendation(
    context: ContextSnapshot,
    candidates: CandidateTask[]
  ): Promise<AIRecommendation> {
    if (candidates.length === 0) {
      throw new Error('No candidates provided for arbitration');
    }

    const systemPrompt = this.buildArbitrationPrompt();
    const userPrompt = this.buildArbitrationUserPrompt(context, candidates);
    
    try {
      const response = await this.callAI(userPrompt, systemPrompt);
      return this.parseRecommendation(response, candidates);
    } catch (error) {
      console.error('AI arbitration failed:', error);
      // Fallback to first candidate
      return {
        selectedTaskId: candidates[0].task.id,
        confidence: 0.5,
        reason: 'Fallback to top candidate due to AI error',
      };
    }
  }

  /**
   * Help with stuck task
   */
  async helpWithStuckTask(
    task: { id: string; title: string; description?: string },
    context: ContextSnapshot,
    issue?: string
  ): Promise<{
    suggestions: string[];
    nextSteps?: string[];
    clarificationQuestions?: string[];
  }> {
    const systemPrompt = this.buildStuckTaskPrompt();
    const userPrompt = this.buildStuckTaskUserPrompt(task, context, issue);
    
    try {
      const response = await this.callAI(userPrompt, systemPrompt);
      return this.parseStuckTaskResponse(response);
    } catch (error) {
      console.error('AI stuck task help failed:', error);
      return {
        suggestions: ['Try breaking the task into smaller steps'],
        nextSteps: ['Identify what exactly is blocking you'],
        clarificationQuestions: ['What specifically is confusing or difficult?'],
      };
    }
  }

  /**
   * Generate weekly insights
   */
  async generateWeeklyInsights(
    completedTasks: number,
    projectsAdvanced: number,
    ideasCaptured: number,
    focusTime: number
  ): Promise<string[]> {
    const systemPrompt = this.buildWeeklyInsightsPrompt();
    const userPrompt = this.buildWeeklyInsightsUserPrompt(
      completedTasks,
      projectsAdvanced,
      ideasCaptured,
      focusTime
    );
    
    try {
      const response = await this.callAI(userPrompt, systemPrompt);
      return this.parseWeeklyInsights(response);
    } catch (error) {
      console.error('AI weekly insights failed:', error);
      return [];
    }
  }

  // Prompt builders
  protected buildInterpretationPrompt(context?: ContextSnapshot): string {
    return `You are the capture interpreter for Life OS.

Your role:
- Analyze user input and determine if it represents a task, project, goal, or is unclear.
- Extract a clear, actionable title.
- Provide a confidence score (0-1) based on how certain you are.
- Return ONLY a JSON object with the following structure:
  {
    "type": "task" | "project" | "goal" | "unknown",
    "title": "string",
    "description": "optional string",
    "confidence": number between 0 and 1
  }

Rules:
- Be conservative with confidence. If uncertain, use low confidence.
- For tasks, the title should start with a verb (e.g., "Implement login", "Write documentation").
- For projects, the title should be a noun phrase (e.g., "User Authentication System", "Documentation").
- For goals, the title should be outcome-focused (e.g., "Build Life OS MVP", "Learn React Native").
- If the input is unclear or could be multiple types, use type "unknown".
- NEVER create data or modify anything. Only interpret.
- NEVER return anything other than the JSON object.`;
  }

  protected buildInterpretationUserPrompt(input: string): string {
    return `User input: "${input}"

Interpret this input and return your analysis as JSON.`;
  }

  protected parseInterpretation(response: string): AIInterpretation {
    try {
      const parsed = JSON.parse(response);
      return {
        type: parsed.type || 'unknown',
        title: parsed.title || '',
        description: parsed.description,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        additionalInfo: parsed.additionalInfo,
      };
    } catch {
      return {
        type: 'unknown',
        title: '',
        confidence: 0,
      };
    }
  }

  protected buildArbitrationPrompt(): string {
    return `You are the recommendation arbitrator for Life OS.

Your role:
- Select the best task to recommend from the provided candidates.
- Consider the user's context (time available, energy level, active project, etc.).
- Return ONLY a JSON object with the following structure:
  {
    "selectedTaskId": "string - ID of the selected task",
    "confidence": number between 0 and 1,
    "reason": "string - brief explanation",
    "alternativeTaskId": "optional string - ID of an alternative task"
  }

Rules:
- You MUST select a task from the candidates. Never invent a task.
- You MUST NOT create, modify, or assume any data exists.
- The selectedTaskId MUST be one of the candidate task IDs.
- Consider what is most useful, not just easiest.
- If no good candidate exists, you may select none by returning confidence 0.
- NEVER return anything other than the JSON object.`;
  }

  protected buildArbitrationUserPrompt(
    context: ContextSnapshot,
    candidates: CandidateTask[]
  ): string {
    const candidateList = candidates.map(c => {
      return `{
        id: "${c.task.id}",
        title: "${c.task.title}",
        estimatedMinutes: ${c.task.estimated_minutes || 'unknown'},
        deadline: "${c.task.deadline || 'none'}",
        energyRequired: "${c.task.energy_required || 'unknown'}",
        project: "${c.project?.title || 'none'}",
        goal: "${c.goal?.title || 'none'}",
        unblocks: ${c.blockingTasks.length}
      }`;
    }).join(',\n');

    return `Context:
- Time: ${context.now}
- Available minutes: ${context.availableMinutes || 'unknown'}
- Energy: ${context.energy || 'unknown'}
- Period: ${context.period}
- Device: ${context.device}
- Active project: ${context.activeProjectId || 'none'}
- Recent projects: [${context.recentProjectIds.join(', ') || 'none'}]

Candidates:
[${candidateList}]

Select the best task to recommend and provide your reasoning.`;
  }

  protected parseRecommendation(
    response: string,
    candidates: CandidateTask[]
  ): AIRecommendation {
    try {
      const parsed = JSON.parse(response);
      
      // Validate selectedTaskId
      const validIds = candidates.map(c => c.task.id);
      if (!validIds.includes(parsed.selectedTaskId)) {
        // Fallback to first candidate
        return {
          selectedTaskId: candidates[0].task.id,
          confidence: 0.5,
          reason: 'Invalid task ID, fallback to first candidate',
        };
      }

      return {
        selectedTaskId: parsed.selectedTaskId,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reason: parsed.reason || 'No reason provided',
        alternativeTaskId: parsed.alternativeTaskId,
      };
    } catch {
      // Fallback to first candidate
      return {
        selectedTaskId: candidates[0].task.id,
        confidence: 0.5,
        reason: 'Failed to parse AI response, fallback to first candidate',
      };
    }
  }

  protected buildStuckTaskPrompt(): string {
    return `You are the task assistant for Life OS.

Your role:
- Help users when they're stuck on a task.
- Provide actionable suggestions.
- Ask clarification questions if needed.
- Return ONLY a JSON object with the following structure:
  {
    "suggestions": ["array of suggestion strings"],
    "nextSteps": ["array of next step strings"],
    "clarificationQuestions": ["array of question strings"]
  }

Rules:
- Be practical and actionable.
- Suggestions should be specific to the task.
- Next steps should be smaller, concrete actions.
- Ask questions that help identify the real blocker.
- NEVER return anything other than the JSON object.`;
  }

  protected buildStuckTaskUserPrompt(
    task: { id: string; title: string; description?: string },
    context: ContextSnapshot,
    issue?: string
  ): string {
    return `Task:
- Title: ${task.title}
- Description: ${task.description || 'none'}
- Issue: ${issue || 'User says they are stuck'}

Context:
- Time: ${context.now}
- Energy: ${context.energy || 'unknown'}
- Available time: ${context.availableMinutes || 'unknown'}

Provide suggestions, next steps, and clarification questions to help the user.`;
  }

  protected parseStuckTaskResponse(response: string): {
    suggestions: string[];
    nextSteps?: string[];
    clarificationQuestions?: string[];
  } {
    try {
      const parsed = JSON.parse(response);
      return {
        suggestions: parsed.suggestions || [],
        nextSteps: parsed.nextSteps,
        clarificationQuestions: parsed.clarificationQuestions,
      };
    } catch {
      return {
        suggestions: ['Try breaking the task into smaller steps'],
        nextSteps: ['Identify what exactly is blocking you'],
        clarificationQuestions: ['What specifically is confusing or difficult?'],
      };
    }
  }

  protected buildWeeklyInsightsPrompt(): string {
    return `You are the insights generator for Life OS.

Your role:
- Generate insightful observations based on weekly activity data.
- Be factual and non-judgmental.
- Return ONLY a JSON array of insight strings.

Rules:
- Focus on patterns and observations, not judgments.
- Be concise (1-2 sentences per insight).
- Generate 2-4 insights.
- NEVER return anything other than the JSON array.`;
  }

  protected buildWeeklyInsightsUserPrompt(
    completedTasks: number,
    projectsAdvanced: number,
    ideasCaptured: number,
    focusTime: number
  ): string {
    return `Weekly data:
- Tasks completed: ${completedTasks}
- Projects advanced: ${projectsAdvanced}
- Ideas captured: ${ideasCaptured}
- Focus time (minutes): ${focusTime}

Generate insights based on this data.`;
  }

  protected parseWeeklyInsights(response: string): string[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
